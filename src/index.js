const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { startScheduler } = require('./scheduler'); // Import the scheduler start function

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors()); // Configure CORS appropriately for your frontend origin
app.use(express.json()); // Middleware to parse JSON bodies

// --- Routes ---
const escrowRoutes = require('./routes/escrow'); // Adjust path if needed
const zoomRoutes = require('./routes/zoom'); // Adjust path if needed
const dbPlaceholder = require('./database'); // Import db to potentially initialize connection

app.use('/escrow', escrowRoutes);
app.use('/zoom', zoomRoutes);

// Basic root route
app.get('/', (req, res) => {
    res.send('Pay2Ping Backend Running!');
});

// --- Global Error Handler (Example) ---
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.stack || err);
    res.status(500).send({ error: 'Something went wrong!', details: err.message });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);


    console.log("Starting background scheduler...");
    startScheduler();
});

