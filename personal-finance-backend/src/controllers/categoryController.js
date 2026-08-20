const pool = require('../config/database');

const getCategories = async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM categories ORDER BY id ASC');
        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh mục:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy danh mục' });
    }
};

module.exports = { getCategories };