const express = require('express');
const router = express.Router();
const { getBudgets, upsertBudget, deleteBudget } = require('../controllers/budgetController');

// Đăng ký API lấy danh sách ngân sách
router.get('/', getBudgets);

// Đăng ký API thêm/sửa ngân sách
router.post('/', upsertBudget);

// Đăng ký API xóa ngân sách
router.delete('/:id', deleteBudget);

module.exports = router;
