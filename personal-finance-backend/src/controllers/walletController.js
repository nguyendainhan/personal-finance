const pool = require('../config/database');

// LẤY DANH SÁCH VÍ
const getWallets = async (req, res) => {
    try {
        const userId = req.user.id;
        const [wallets] = await pool.query('SELECT * FROM wallets WHERE user_id = ? ORDER BY id DESC', [userId]);
        
        res.status(200).json({ success: true, data: wallets });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách ví:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy dữ liệu ví' });
    }
};

// THÊM VÍ MỚI
const addWallet = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, balance, currency } = req.body;
        
        if (!name) return res.status(400).json({ success: false, message: 'Tên ví không được để trống' });
        const curr = currency || 'TWD'; // Mặc định là TWD nếu không chọn

        await pool.query(
            'INSERT INTO wallets (user_id, name, balance, currency) VALUES (?, ?, ?, ?)', 
            [userId, name, balance || 0, curr]
        );
        res.status(201).json({ success: true, message: 'Thêm ví thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi thêm ví' });
    }
};

// CẬP NHẬT VÍ
const updateWallet = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { name, balance, currency } = req.body;

        await pool.query(
            'UPDATE wallets SET name = ?, balance = ?, currency = ? WHERE id = ? AND user_id = ?', 
            [name, balance, currency, id, userId]
        );
        res.status(200).json({ success: true, message: 'Cập nhật ví thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật ví' });
    }
};

// XÓA VÍ
const deleteWallet = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        await pool.query('DELETE FROM wallets WHERE id = ? AND user_id = ?', [id, userId]);
        res.status(200).json({ success: true, message: 'Xóa ví thành công' });
    } catch (error) {
        // Bắt lỗi khóa ngoại (Foreign Key Constraint)
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ 
                success: false, 
                message: 'Không thể xóa! Ví này đang chứa lịch sử giao dịch. Hãy xóa các giao dịch trước.' 
            });
        }
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa ví' });
    }
};

module.exports = { getWallets, addWallet, updateWallet, deleteWallet };