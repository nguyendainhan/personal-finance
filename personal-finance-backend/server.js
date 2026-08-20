const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Để parse JSON body từ Frontend

// Khai báo các Routes
const walletRoutes = require('./src/routes/walletRoutes');
app.use('/api/wallets', walletRoutes);

// Khai báo Route cho Transactions
const transactionRoutes = require('./src/routes/transactionRoutes');
app.use('/api/transactions', transactionRoutes);

// Thêm vào cùng chỗ khai báo routes
const categoryRoutes = require('./src/routes/categoryRoutes');
app.use('/api/categories', categoryRoutes);

// Test DB Connection
const pool = require('./src/config/database');
pool.query('SELECT 1 + 1 AS solution')
    .then(() => console.log('✅ Connected to MySQL Database'))
    .catch(err => console.error('❌ Database connection error:', err));

// Route cơ bản
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to IceStore Finance API' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});