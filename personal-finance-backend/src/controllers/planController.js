const pool = require('../config/database');

// 1. API TIẾT KIỆM (SAVINGS)
const getSavings = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.query("SELECT * FROM savings WHERE user_id = ? ORDER BY created_at DESC", [userId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const addSaving = async (req, res) => {
    try {
        const { name, target_amount, target_date } = req.body;
        const userId = req.user.id;
        await pool.query(
            "INSERT INTO savings (name, target_amount, target_date, user_id) VALUES (?, ?, ?, ?)", 
            [name, target_amount, target_date, userId]
        );
        res.json({ success: true, message: "Thêm mục tiêu tiết kiệm thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateSaving = async (req, res) => {
    try {
        const { saved_amount, status } = req.body;
        const userId = req.user.id;
        await pool.query(
            "UPDATE savings SET saved_amount = ?, status = ? WHERE id = ? AND user_id = ?", 
            [saved_amount, status, req.params.id, userId]
        );
        res.json({ success: true, message: "Cập nhật tiến độ thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. API KHOẢN NỢ (DEBTS)
const getDebts = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.query("SELECT * FROM debts WHERE user_id = ? ORDER BY created_at DESC", [userId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const addDebt = async (req, res) => {
    try {
        const { name, type, total_amount, due_date } = req.body;
        const userId = req.user.id;
        await pool.query(
            "INSERT INTO debts (name, type, total_amount, due_date, user_id) VALUES (?, ?, ?, ?, ?)", 
            [name, type, total_amount, due_date, userId]
        );
        res.json({ success: true, message: "Thêm khoản nợ thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateDebt = async (req, res) => {
    try {
        const { paid_amount, status } = req.body;
        const userId = req.user.id;
        await pool.query(
            "UPDATE debts SET paid_amount = ?, status = ? WHERE id = ? AND user_id = ?", 
            [paid_amount, status, req.params.id, userId]
        );
        res.json({ success: true, message: "Cập nhật tiến độ nợ thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getSavings, addSaving, updateSaving, getDebts, addDebt, updateDebt };