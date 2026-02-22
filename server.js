require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Menu = require('./models/Menu');

const app = express();
const PORT = process.env.PORT || 5001;

// Create server and socket.io instance
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    },
    // Disconnect stale/zombie connections quickly to free memory
    pingTimeout: 20000,      // 20s — close socket if no pong received
    pingInterval: 15000,     // 15s — send pings more frequently
    maxHttpBufferSize: 1e6   // 1MB max message size (default is 1MB, be explicit)
});

// Middleware
app.use(cors());

// ── Stripe webhook (must be before bodyParser so raw body is preserved) ──
const StripeWebhook = require('stripe')((process.env.STRIPE_SECRET_KEY || '').trim(), { apiVersion: '2024-06-20' });
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  if (webhookSecret && sig) {
    try {
      event = StripeWebhook.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    // No secret configured — parse body manually (dev/testing only)
    try { event = JSON.parse(req.body.toString()); } catch { return res.status(400).send('Invalid body'); }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      try {
        const Order = require('./models/Order');
        // Build update — store financial breakdown fields from metadata if present
        const updateFields = { paid: true, paymentId: session.id };
        const meta = session.metadata || {};
        if (meta.taxAmount) updateFields.taxAmount = parseFloat(meta.taxAmount);
        if (meta.convenienceFee) updateFields.convenienceFee = parseFloat(meta.convenienceFee);
        if (meta.stripeTotal) updateFields.stripeTotal = parseFloat(meta.stripeTotal);
        await Order.findByIdAndUpdate(orderId, updateFields);
        // total stays as subtotal; stripeTotal holds the full charged amount
        io.emit('ordersUpdated');
        console.log(`Order ${orderId} marked as paid via Stripe webhook`);
      } catch (err) {
        console.error('Error updating order from webhook:', err);
      }
    }
  }

  res.json({ received: true });
});
// ─────────────────────────────────────────────────────────────────────────────

app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ limit: '2mb', extended: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use(express.static('client/build'));

// bufferTimeoutMS is a Mongoose-level option — must NOT go inside the driver options object
mongoose.set('bufferTimeoutMS', 10000);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,  // Fail fast if Atlas is unreachable (10s)
    socketTimeoutMS: 45000,           // Close idle sockets after 45s
    connectTimeoutMS: 10000,          // Connection attempt timeout
    maxPoolSize: 10,                  // Limit connection pool to avoid memory bloat
})
.then(() => {
    console.log('MongoDB connected');
    seedDatabase(); // Add this line
})
.catch(err => console.error('MongoDB connection error:', err));

// Pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'client', 'public', 'images');
        // Ensure the directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
        cb(null, basename + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Check file type
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit (changed from 5MB)
    }
});

// Image upload endpoint
app.post('/api/upload-image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }
        
        const imagePath = '/images/' + req.file.filename;
        res.json({ 
            success: true, 
            imagePath: imagePath,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ message: 'Failed to upload image' });
    }
});

// Delete image endpoint
app.delete('/api/delete-image/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const imagePath = path.join(__dirname, 'client', 'public', 'images', filename);
        
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            res.json({ success: true, message: 'Image deleted successfully' });
        } else {
            res.status(404).json({ message: 'Image not found' });
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ message: 'Failed to delete image' });
    }
});

// Static files
app.use('/images', express.static(path.join(__dirname, 'client', 'public', 'images')));
app.use(express.static(path.join(__dirname, 'client', 'build')));

// Routes
const orderRoutes = require('./routes/orders');
const menuRoutes = require('./routes/menu');
const paymentRoutes = require('./routes/payments');
const settingsRoutes = require('./routes/settings'); // Add this line

app.use('/api/orders', orderRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes); // Add this line

// Serve React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Add this seed function after your MongoDB connection
const seedDatabase = async () => {
    try {
        const count = await Menu.countDocuments();
        if (count === 0) {
            console.log('No menu items found. Run migration script to populate menu.');
        }
    } catch (error) {
        console.error('Error checking menu items:', error);
    }
};
