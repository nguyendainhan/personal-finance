const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // 1. Lấy token từ Header của request gửi lên
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập! Vui lòng cung cấp Token.' });
    }

    // 2. Tách lấy phần mã Token (Bỏ chữ "Bearer " ở trước)
    const token = authHeader.split(' ')[1];

    try {
        // 3. Dịch ngược Token xem có khớp với Chìa khóa bí mật không
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Mở khóa thành công! Gắn ID của user vào req để các API phía sau lấy dùng
        req.user = decoded; 
        next(); // Cho phép đi qua cổng để vào API
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
};

module.exports = { verifyToken };