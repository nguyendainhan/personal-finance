const express = require('express');
const router = express.Router();

// Nhớ thêm updateTransaction vào đây
const { 
    getTransactions, 
    createTransaction, 
    deleteTransaction, 
    updateTransaction 
} = require('../controllers/transactionController');

// Các API
router.get('/', getTransactions);
router.post('/', createTransaction);
router.delete('/:id', deleteTransaction);
router.put('/:id', updateTransaction); // <-- DÒNG MỚI ĐỂ SỬA GIAO DỊCH

module.exports = router;