const pool = require('../config/database');

const getWallets = async (req, res) => {
    try {
        // Tạm thời hardcode user_id = 1 (Sau này làm phần Đăng nhập sẽ lấy từ Token)
        const userId = 1; 
        
        // Truy vấn lấy danh sách ví của user này
        const [wallets] = await pool.query('SELECT * FROM wallets WHERE user_id = ?', [userId]);
        
        // Trả về JSON chuẩn
        res.status(200).json({
            success: true,
            data: wallets
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách ví:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy dữ liệu ví'
        });
    }
};

module.exports = { getWallets };