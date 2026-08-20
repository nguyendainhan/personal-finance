const pool = require('../config/database');

const getTransactions = async (req, res) => {
    try {
        const userId = 1; // Hardcode tạm thời
        
        // Nhận tham số tháng và năm từ Frontend gửi lên (nếu có)
        const { month, year } = req.query; 

        let query = `
            SELECT 
                t.id, 
                t.wallet_id,      
                t.category_id,
                t.to_wallet_id,
                t.amount, 
                t.type, 
                t.note, 
                t.transaction_date,
                c.name AS category_name, 
                c.icon AS category_icon, 
                c.color AS category_color,
                w.name AS wallet_name,
                tw.name AS to_wallet_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            JOIN wallets w ON t.wallet_id = w.id
            LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
            WHERE t.user_id = ?
        `;

        const queryParams = [userId];

        // Nếu Frontend có gửi tháng và năm thì nối thêm điều kiện lọc vào SQL
        if (month && year) {
            query += ` AND MONTH(t.transaction_date) = ? AND YEAR(t.transaction_date) = ?`;
            queryParams.push(month, year);
        }

        // Sắp xếp ngày mới nhất lên đầu
        query += ` ORDER BY t.transaction_date DESC, t.id DESC`;

        const [transactions] = await pool.query(query, queryParams);

        res.status(200).json({
            success: true,
            data: transactions
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách giao dịch:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi lấy dữ liệu giao dịch'
        });
    }
};

// --- THÊM HÀM MỚI NÀY ---
const createTransaction = async (req, res) => {
    try {
        const userId = 1; // Hardcode tạm thời
        const { wallet_id, to_wallet_id, category_id, amount, type, note, transaction_date } = req.body;

        // Validate cơ bản để đảm bảo FE gửi đủ dữ liệu
        if (!wallet_id || !amount || !type || !transaction_date) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ các trường bắt buộc (wallet_id, amount, type, transaction_date)'
            });
        }

        const query = `
            INSERT INTO transactions 
            (user_id, wallet_id, to_wallet_id, category_id, amount, type, note, transaction_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Execute query (những trường không có thì gán null)
        const [result] = await pool.query(query, [
            userId,
            wallet_id,
            to_wallet_id || null,
            category_id || null,
            amount,
            type,
            note || null,
            transaction_date
        ]);

        res.status(201).json({
            success: true,
            message: 'Tạo giao dịch thành công',
            data: {
                id: result.insertId, // Trả về ID của giao dịch vừa tạo
                wallet_id,
                amount,
                type
            }
        });

    } catch (error) {
        console.error('Lỗi khi tạo giao dịch:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tạo giao dịch mới'
        });
    }
};

const deleteTransaction = async (req, res) => {
    try {
        // Lấy ID giao dịch từ URL (vd: /api/transactions/5)
        const transactionId = req.params.id; 
        const userId = 1; // Tạm thời hardcode bảo mật chỉ cho xóa giao dịch của mình

        const [result] = await pool.query(
            'DELETE FROM transactions WHERE id = ? AND user_id = ?', 
            [transactionId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giao dịch hoặc bạn không có quyền xóa'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Đã xóa giao dịch thành công (Tiền trong ví đã được hoàn lại)'
        });

    } catch (error) {
        console.error('Lỗi khi xóa giao dịch:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi xóa giao dịch'
        });
    }
};

const updateTransaction = async (req, res) => {
    try {
        const transactionId = req.params.id;
        const userId = 1; // Hardcode tạm thời

        const { wallet_id, to_wallet_id, category_id, amount, type, note, transaction_date } = req.body;

        // console.log('Dữ liệu FE gửi lên để Sửa:', req.body);
        // Validate cơ bản
        if (!wallet_id || !amount || !type || !transaction_date) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ các trường bắt buộc'
            });
        }

        const query = `
            UPDATE transactions 
            SET wallet_id = ?, to_wallet_id = ?, category_id = ?, amount = ?, type = ?, note = ?, transaction_date = ?
            WHERE id = ? AND user_id = ?
        `;

        const [result] = await pool.query(query, [
            wallet_id,
            to_wallet_id || null,
            category_id || null,
            amount,
            type,
            note || null,
            transaction_date,
            transactionId,
            userId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giao dịch hoặc không có quyền sửa'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật giao dịch thành công (Số dư các ví đã tự động điều chỉnh)'
        });

    } catch (error) {
        console.error('Lỗi khi cập nhật giao dịch:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi cập nhật giao dịch'
        });
    }
};

// Cập nhật lại dòng export cuối file:
module.exports = { getTransactions, createTransaction, deleteTransaction, updateTransaction };