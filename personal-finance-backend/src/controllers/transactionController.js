const pool = require('../config/database');

const getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        
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
                w.currency AS currency, /* <--- BỔ SUNG DÒNG NÀY ĐỂ BIẾT LOẠI TIỀN CỦA GIAO DỊCH */
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

// --- CẬP NHẬT HÀM CREATETRANSACTION NÀY ---
const createTransaction = async (req, res) => {
    const connection = await pool.getConnection(); // Lấy connection riêng để chạy Transaction
    try {
        await connection.beginTransaction(); // Bắt đầu phiên giao dịch

        const userId = req.user.id; 
        const { wallet_id, to_wallet_id, category_id, amount, type, note, transaction_date } = req.body;

        if (!wallet_id || !amount || !type || !transaction_date) {
            await connection.release();
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ các trường bắt buộc'
            });
        }

        // 1. Thêm giao dịch vào bảng transactions
        const query = `
            INSERT INTO transactions 
            (user_id, wallet_id, to_wallet_id, category_id, amount, type, note, transaction_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await connection.query(query, [
            userId,
            wallet_id,
            to_wallet_id || null,
            category_id || null,
            amount,
            type,
            note || null,
            transaction_date
        ]);

        // 2. TỰ ĐỘNG CẬP NHẬT SỐ DƯ VÍ
        if (type === 'EXPENSE') {
            // Chi tiêu -> Trừ tiền trong ví nguồn
            await connection.query(
                'UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?',
                [amount, wallet_id, userId]
            );
        } else if (type === 'INCOME') {
            // Thu nhập -> Cộng tiền vào ví
            await connection.query(
                'UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?',
                [amount, wallet_id, userId]
            );
        } else if (type === 'TRANSFER' && to_wallet_id) {
            // Chuyển tiền -> Trừ ví gửi, cộng ví nhận
            await connection.query(
                'UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?',
                [amount, wallet_id, userId]
            );
            await connection.query(
                'UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?',
                [amount, to_wallet_id, userId]
            );
        }

        await connection.commit(); // Xác nhận mọi thứ thành công
        connection.release(); // Trả lại connection

        res.status(201).json({
            success: true,
            message: 'Tạo giao dịch và cập nhật số dư ví thành công',
            data: {
                id: result.insertId,
                wallet_id,
                amount,
                type
            }
        });

    } catch (error) {
        await connection.rollback(); // Hoàn tác nếu có lỗi xảy ra
        connection.release();
        console.error('Lỗi khi tạo giao dịch:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tạo giao dịch mới'
        });
    }
};

// --- NÂNG CẤP HÀM XÓA (TỰ ĐỘNG HOÀN TIỀN) ---
const deleteTransaction = async (req, res) => {
    const connection = await pool.getConnection(); // Dùng Transaction để an toàn
    try {
        await connection.beginTransaction();
        const transactionId = req.params.id; 
        const userId = req.user.id;

        // 1. Tìm giao dịch cũ để biết số tiền cần hoàn lại
        const [txs] = await connection.query('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [transactionId, userId]);
        if (txs.length === 0) {
            await connection.release();
            return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
        }
        const tx = txs[0];

        // 2. Thu hồi tiền trả lại ví
        if (tx.type === 'EXPENSE') {
            await connection.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [tx.amount, tx.wallet_id]);
        } else if (tx.type === 'INCOME') {
            await connection.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [tx.amount, tx.wallet_id]);
        } else if (tx.type === 'TRANSFER' && tx.to_wallet_id) {
            await connection.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [tx.amount, tx.wallet_id]); // Trả lại ví gửi
            await connection.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [tx.amount, tx.to_wallet_id]); // Trừ ví nhận
        }

        // 3. Tiến hành xóa lịch sử
        await connection.query('DELETE FROM transactions WHERE id = ?', [transactionId]);

        await connection.commit();
        connection.release();
        res.status(200).json({ success: true, message: 'Đã xóa và hoàn tiền về ví thành công!' });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Lỗi khi xóa giao dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xóa giao dịch' });
    }
};

// --- NÂNG CẤP HÀM SỬA (TỰ ĐỘNG TÍNH TOÁN LẠI CHÊNH LỆCH TIỀN) ---
const updateTransaction = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const transactionId = req.params.id;
        const userId = req.user.id;
        const { wallet_id, to_wallet_id, category_id, amount, type, note, transaction_date } = req.body;

        // 1. Lấy thông tin giao dịch cũ
        const [txs] = await connection.query('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [transactionId, userId]);
        if (txs.length === 0) throw new Error('Không tìm thấy giao dịch');
        const oldTx = txs[0];

        // 2. BƯỚC HOÀN TÁC: Trả lại tiền của giao dịch cũ về ví
        if (oldTx.type === 'EXPENSE') {
            await connection.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [oldTx.amount, oldTx.wallet_id]);
        } else if (oldTx.type === 'INCOME') {
            await connection.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [oldTx.amount, oldTx.wallet_id]);
        }

        // 3. BƯỚC CẬP NHẬT: Trừ/Cộng tiền theo thông tin giao dịch mới
        if (type === 'EXPENSE') {
            await connection.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [amount, wallet_id]);
        } else if (type === 'INCOME') {
            await connection.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [amount, wallet_id]);
        }

        // 4. Lưu dữ liệu mới vào bảng transactions
        await connection.query(`
            UPDATE transactions 
            SET wallet_id = ?, to_wallet_id = ?, category_id = ?, amount = ?, type = ?, note = ?, transaction_date = ?
            WHERE id = ? AND user_id = ?
        `, [wallet_id, to_wallet_id || null, category_id || null, amount, type, note || null, transaction_date, transactionId, userId]);

        await connection.commit();
        connection.release();
        res.status(200).json({ success: true, message: 'Cập nhật giao dịch và số dư ví thành công!' });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Lỗi cập nhật:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi cập nhật giao dịch' });
    }
};

// Cập nhật lại dòng export cuối file:
module.exports = { getTransactions, createTransaction, deleteTransaction, updateTransaction };