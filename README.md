# Chaat Mahal Kiosk

This is a simple web application for the Chaat Mahal food truck in Charlotte. The application allows customers to place orders through a kiosk interface, while the owner can manage and prepare those orders from the backend.

## Project Structure

```
chaat-mahal-kiosk
├── server.js          # Entry point for the Express server
├── models
│   └── Order.js       # Mongoose model for orders
├── routes
│   └── orders.js      # API routes for order management
├── client
│   ├── public
│   │   └── index.html # Main HTML file for the React app
│   └── src
│       ├── App.jsx    # Main React component
│       ├── index.js   # Entry point for the React application
│       ├── KioskForm.jsx # Component for customer order input
│       ├── OrderList.jsx  # Component for displaying orders
│       └── MenuList.jsx    # Component for displaying menu items
├── package.json       # npm configuration file
└── README.md          # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd chaat-mahal-kiosk
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Set up the MongoDB database:**
   Ensure you have a MongoDB instance running. Update the connection string in `server.js` as needed.

4. **Run the application:**
   ```
   node server.js
   ```
   The server will start, and you can access the kiosk interface in your browser.

5. **Access the client:**
   Open `client/public/index.html` in your browser to interact with the kiosk.

## Usage

- Customers can enter their name and select items from the menu to place an order.
- The owner can view the list of orders in the order they were received and mark them as completed.

## Technologies Used

- **Backend:** Node.js, Express, MongoDB
- **Frontend:** React

## License

This project is licensed under the MIT License.