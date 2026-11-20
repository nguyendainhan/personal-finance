const pool = require('../config/database');

// Tự động kiểm tra và thêm cột to_amount vào bảng transactions (hỗ trợ chuyển tiền khác ngoại tệ TWD <-> VND <-> USD)
let columnChecked = false;
const ensureToAmountColumn = async () => {
    if (columnChecked) return;
    try {
        const [cols] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'transactions' 
              AND COLUMN_NAME = 'to_amount'
        `);
        if (cols.length === 0) {
            await pool.query(`
                ALTER TABLE transactions 
                ADD COLUMN to_amount DECIMAL(15,2) DEFAULT NULL AFTER amount
            `);
            console.log('✅ Đã tự động bổ sung cột to_amount vào bảng transactions');
        }
        columnChecked = true;
    } catch (err) {
        console.warn('Lưu ý khi kiểm tra cột to_amount:', err.message);
    }
};

// Khởi chạy kiểm tra ngay khi nạp controller
ensureToAmountColumn();

const getTransactions = async (req, res) => {
    try {
        await ensureToAmountColumn();
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
                t.to_amount,
                t.type, 
                t.note, 
                t.transaction_date,
                c.name AS category_name, 
                c.icon AS category_icon, 
                c.color AS category_color,
                w.name AS wallet_name,
                w.currency AS currency,
                tw.name AS to_wallet_name,
                tw.currency AS to_currency
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

// --- HÀM TẠO GIAO DỊCH (HỖ TRỢ ĐA TIỀN TỆ KHI CHUYỂN KHOẢN) ---
const createTransaction = async (req, res) => {
    await ensureToAmountColumn();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userId = req.user.id; 
        const { wallet_id, to_wallet_id, category_id, amount, to_amount, type, note, transaction_date } = req.body;

        if (!wallet_id || !amount || !type || !transaction_date) {
            await connection.release();
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ các trường bắt buộc'
            });
        }

        if (type === 'TRANSFER' && (!to_wallet_id || String(to_wallet_id) === String(wallet_id))) {
            await connection.release();
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn ví nhận khác với ví nguồn khi chuyển khoản'
            });
        }

        // Số tiền thực cộng vào ví đích (nếu chuyển khoản khác tiền tệ thì lấy to_amount, nếu cùng tiền tệ thì bằng amount)
        const targetAmount = type === 'TRANSFER'
            ? (to_amount && Number(to_amount) > 0 ? Number(to_amount) : Number(amount))
            : null;

        // 1. Thêm giao dịch vào bảng transactions
        const query = `
            INSERT INTO transactions 
            (user_id, wallet_id, to_wallet_id, category_id, amount, to_amount, type, note, transaction_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await connection.query(query, [
            userId,
            wallet_id,
            type === 'TRANSFER' ? (to_wallet_id || null) : null,
            type === 'TRANSFER' ? null : (category_id || null),
            amount,
            targetAmount,
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
            // Chuyển tiền -> Trừ amount ở ví gửi, cộng targetAmount ở ví nhận
            await connection.query(
                'UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?',
                [amount, wallet_id, userId]
            );
            await connection.query(
                'UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?',
                [targetAmount, to_wallet_id, userId]
            );
        }

        await connection.commit();
        connection.release();

        res.status(201).json({
            success: true,
            message: 'Tạo giao dịch và cập nhật số dư ví thành công',
            data: {
                id: result.insertId,
                wallet_id,
                amount,
                to_amount: targetAmount,
                type
            }
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Lỗi khi tạo giao dịch:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tạo giao dịch mới'
        });
    }
};

// --- HÀM XÓA GIAO DỊCH (TỰ ĐỘNG HOÀN TIỀN ĐÚNG NGOẠI TỆ) ---
const deleteTransaction = async (req, res) => {
    await ensureToAmountColumn();
    const connection = await pool.getConnection();
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
            await connection.query('UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?', [tx.amount, tx.wallet_id, userId]);
        } else if (tx.type === 'INCOME') {
            await connection.query('UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?', [tx.amount, tx.wallet_id, userId]);
        } else if (tx.type === 'TRANSFER' && tx.to_wallet_id) {
            const oldTargetAmount = tx.to_amount && Number(tx.to_amount) > 0 ? tx.to_amount : tx.amount;
            await connection.query('UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?', [tx.amount, tx.wallet_id, userId]); // Trả lại ví gửi
            await connection.query('UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?', [oldTargetAmount, tx.to_wallet_id, userId]); // Trừ đúng số tiền đã nhận ở ví nhận
        }

        // 3. Tiến hành xóa lịch sử
        await connection.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [transactionId, userId]);

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

// --- HÀM SỬA GIAO DỊCH (TỰ ĐỘNG TÍNH TOÁN LẠI CHÊNH LỆCH ĐA TIỀN TỆ) ---
const updateTransaction = async (req, res) => {
    await ensureToAmountColumn();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const transactionId = req.params.id;
        const userId = req.user.id;
        const { wallet_id, to_wallet_id, category_id, amount, to_amount, type, note, transaction_date } = req.body;

        if (type === 'TRANSFER' && (!to_wallet_id || String(to_wallet_id) === String(wallet_id))) {
            await connection.release();
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn ví nhận khác với ví nguồn khi chuyển khoản'
            });
        }

        // 1. Lấy thông tin giao dịch cũ
        const [txs] = await connection.query('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [transactionId, userId]);
        if (txs.length === 0) throw new Error('Không tìm thấy giao dịch');
        const oldTx = txs[0];

        // 2. BƯỚC HOÀN TÁC: Trả lại tiền của giao dịch cũ về ví
        if (oldTx.type === 'EXPENSE') {
            await connection.query('UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?', [oldTx.amount, oldTx.wallet_id, userId]);
        } else if (oldTx.type === 'INCOME') {
            await connection.query('UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?', [oldTx.amount, oldTx.wallet_id, userId]);
        } else if (oldTx.type === 'TRANSFER' && oldTx.to_wallet_id) {
            const oldTargetAmount = oldTx.to_amount && Number(oldTx.to_amount) > 0 ? oldTx.to_amount : oldTx.amount;
            await connection.query('UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?', [oldTx.amount, oldTx.wallet_id, userId]);
            await connection.query('UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?', [oldTargetAmount, oldTx.to_wallet_id, userId]);
        }

        const newTargetAmount = type === 'TRANSFER'
            ? (to_amount && Number(to_amount) > 0 ? Number(to_amount) : Number(amount))
            : null;

        // 3. BƯỚC CẬP NHẬT: Trừ/Cộng tiền theo thông tin giao dịch mới
        if (type === 'EXPENSE') {
            await connection.query('UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?', [amount, wallet_id, userId]);
        } else if (type === 'INCOME') {
            await connection.query('UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?', [amount, wallet_id, userId]);
        } else if (type === 'TRANSFER' && to_wallet_id) {
            await connection.query('UPDATE wallets SET balance = balance - ? WHERE id = ? AND user_id = ?', [amount, wallet_id, userId]);
            await connection.query('UPDATE wallets SET balance = balance + ? WHERE id = ? AND user_id = ?', [newTargetAmount, to_wallet_id, userId]);
        }

        // 4. Lưu dữ liệu mới vào bảng transactions
        await connection.query(`
            UPDATE transactions 
            SET wallet_id = ?, to_wallet_id = ?, category_id = ?, amount = ?, to_amount = ?, type = ?, note = ?, transaction_date = ?
            WHERE id = ? AND user_id = ?
        `, [
            wallet_id,
            type === 'TRANSFER' ? (to_wallet_id || null) : null,
            type === 'TRANSFER' ? null : (category_id || null),
            amount,
            newTargetAmount,
            type,
            note || null,
            transaction_date,
            transactionId,
            userId
        ]);

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

module.exports = { getTransactions, createTransaction, deleteTransaction, updateTransaction };
