const bcrypt = require('bcryptjs');
const pool = require('./src/config/database');

async function updatePassword() {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);
        
        // Cập nhật lại mật khẩu cho user id = 1 (giữ nguyên id để không mất data cũ)
        await pool.query('UPDATE users SET password = ? WHERE id = 1', [hashedPassword]);
        
        console.log("✅ Đã cập nhật mật khẩu mới cho admin thành công! Mật khẩu là: 123456");
        process.exit(0);
    } catch (error) {
        console.error("❌ Lỗi:", error);
    }
}

updatePassword();