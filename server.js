const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const orderRoutes = require('./routes/orders');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
  }
});

const PORT = process.env.PORT || 5001;

// Middleware
app.use(bodyParser.json());
app.use(express.static('client/build'));

// MongoDB connection
mongoose.connect('mongodb+srv://mustafap12:Chaat123@cluster0.hoxvixj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use('/api/orders', orderRoutes);

const path = require("path");

app.use(express.static(path.join(__dirname, "client", "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected');
});

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
