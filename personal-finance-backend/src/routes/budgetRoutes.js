const express = require('express');
const router = express.Router();
const { getBudgets, upsertBudget } = require('../controllers/budgetController');

// Đăng ký API lấy danh sách ngân sách
router.get('/', getBudgets);

// Đăng ký API thêm/sửa ngân sách
router.post('/', upsertBudget);

module.exports = router;