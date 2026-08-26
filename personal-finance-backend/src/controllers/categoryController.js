const pool = require('../config/database');

// LẤY DANH SÁCH DANH MỤC CỦA USER HIỆN TẠI
const getCategories = async (req, res) => {
    try {
        const userId = req.user.id; // Lấy ID user từ token bảo vệ
        
        // Chỉ lấy danh mục thuộc về user này
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE user_id = ? ORDER BY id DESC', 
            [userId]
        );
        
        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh mục:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy danh mục' });
    }
};

// THÊM DANH MỤC MỚI (Ví dụ: Gửi tiền về VN, Mua quần áo...)
const addCategory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, type, icon, color } = req.body; // type là 'INCOME' hoặc 'EXPENSE'

        if (!name || !type) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tên và loại danh mục' });
        }

        const [result] = await pool.query(
            'INSERT INTO categories (user_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)', 
            [userId, name, type, icon || null, color || null]
        );

        res.status(201).json({ 
            success: true, 
            message: 'Thêm danh mục thành công',
            data: { id: result.insertId, name, type }
        });
    } catch (error) {
        console.error('Lỗi khi thêm danh mục:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi thêm danh mục' });
    }
};

// XÓA DANH MỤC
const deleteCategory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [result] = await pool.query(
            'DELETE FROM categories WHERE id = ? AND user_id = ?', 
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục hoặc không có quyền xóa' });
        }

        res.status(200).json({ success: true, message: 'Xóa danh mục thành công' });
    } catch (error) {
        // Bắt lỗi nếu danh mục đang được sử dụng ở bảng transactions
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ 
                success: false, 
                message: 'Không thể xóa! Danh mục này đang được sử dụng trong lịch sử giao dịch.' 
            });
        }
        console.error('Lỗi khi xóa danh mục:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa danh mục' });
    }
};

// CẬP NHẬT (SỬA) DANH MỤC
const updateCategory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { name, type, icon, color } = req.body;

        if (!name || !type) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tên và loại danh mục' });
        }

        const [result] = await pool.query(
            'UPDATE categories SET name = ?, type = ?, icon = ?, color = ? WHERE id = ? AND user_id = ?', 
            [name, type, icon || null, color || null, id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục hoặc không có quyền sửa' });
        }

        res.status(200).json({ success: true, message: 'Cập nhật danh mục thành công' });
    } catch (error) {
        console.error('Lỗi khi cập nhật danh mục:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật danh mục' });
    }
};

// Đừng quên cập nhật dòng module.exports ở cuối file:
module.exports = { getCategories, addCategory, updateCategory, deleteCategory };