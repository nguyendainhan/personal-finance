const pool = require('../config/database');

// 1. Lấy danh sách ngân sách (Chỉ lấy đúng của user đang đăng nhập)
const getBudgets = async (req, res) => {
    try {
        const userId = req.user.id; // Lấy ID chuẩn từ Token
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ success: false, message: 'Thiếu tháng và năm' });
        }

        const query = `
            SELECT 
                b.id, 
                b.category_id, 
                c.name AS category_name, 
                c.icon AS category_icon, 
                c.color AS category_color,
                b.amount AS budget_limit,
                COALESCE(SUM(t.amount), 0) AS total_spent
            FROM budgets b
            JOIN categories c ON b.category_id = c.id
            LEFT JOIN transactions t ON t.category_id = b.category_id 
                AND t.user_id = ?
                AND t.type = 'EXPENSE' 
                AND MONTH(t.transaction_date) = ? 
                AND YEAR(t.transaction_date) = ?
            WHERE b.user_id = ? AND b.month = ? AND b.year = ?
            GROUP BY b.id, b.category_id, c.name, c.icon, c.color, b.amount
        `;

        // Truyền đúng 6 tham số tương ứng với các dấu chấm hỏi (?)
        const [budgets] = await pool.query(query, [userId, month, year, userId, month, year]);

        res.status(200).json({ success: true, data: budgets });
    } catch (error) {
        console.error('Lỗi khi lấy ngân sách:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const upsertBudget = async (req, res) => {
    try {
        const userId = req.user.id; // Lấy ID chuẩn từ Token
        const { category_id, amount, month, year } = req.body;

        if (!category_id || !amount || !month || !year) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đủ thông tin' });
        }

        const query = `
            INSERT INTO budgets (user_id, category_id, amount, month, year)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE amount = VALUES(amount)
        `;

        await pool.query(query, [userId, category_id, amount, month, year]);

        res.status(200).json({ success: true, message: 'Lưu ngân sách thành công' });
    } catch (error) {
        console.error('Lỗi khi lưu ngân sách:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { getBudgets, upsertBudget };