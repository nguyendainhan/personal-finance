const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ĐĂNG KÝ
const register = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Kiểm tra xem username đã tồn tại chưa
        const [existingUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
        }

        // 2. Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Lưu vào database
        const [result] = await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        const newUserId = result.insertId;

        // 4. Tự động tạo Ví mặc định và Danh mục mẫu cho tài khoản mới
        try {
            await pool.query(
                'INSERT INTO wallets (user_id, name, balance, currency) VALUES (?, ?, ?, ?)',
                [newUserId, 'Tiền mặt', 0, 'TWD']
            );

            const defaultCategories = [
                [newUserId, 'Tiền lương', 'INCOME', '💰', '#10b981'],
                [newUserId, 'Thưởng & Phụ cấp', 'INCOME', '🎁', '#3b82f6'],
                [newUserId, 'Ăn uống', 'EXPENSE', '🍜', '#ef4444'],
                [newUserId, 'Tiền nhà & Điện nước', 'EXPENSE', '🏠', '#f97316'],
                [newUserId, 'Di chuyển & Xăng xe', 'EXPENSE', '⛽', '#f59e0b'],
                [newUserId, 'Mua sắm', 'EXPENSE', '🛒', '#8b5cf6'],
                [newUserId, 'Gửi tiền về gia đình', 'EXPENSE', '💸', '#ec4899']
            ];

            await pool.query(
                'INSERT INTO categories (user_id, name, type, icon, color) VALUES ?',
                [defaultCategories]
            );
        } catch (seedErr) {
            console.warn('Không thể tạo dữ liệu mẫu cho user mới:', seedErr.message);
        }

        res.status(201).json({ success: true, message: 'Đăng ký thành công! Hãy đăng nhập.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký' });
    }
};

// ĐĂNG NHẬP
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Tìm user trong database
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
        }

        const user = users[0];

        // 2. So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
        }

        // 3. Tạo Token thông hành (Có chứa ID của user, thời hạn 7 ngày)
        const token = jwt.sign(
            { id: user.id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.status(200).json({ 
            success: true, 
            message: 'Đăng nhập thành công',
            token: token,
            user: { id: user.id, username: user.username }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập' });
    }
};

module.exports = { register, login };
