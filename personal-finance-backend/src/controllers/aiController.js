const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/database');

const analyzeSpending = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ success: false, message: 'Thiếu tháng và năm' });
        }

        const currentMonth = parseInt(month);
        const currentYear = parseInt(year);
        
        // Tính toán tháng trước đó
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = currentYear - 1;
        }

        const userId = req.user.id; // Tạm hardcode theo user hiện tại

        // Câu SQL lấy tổng chi tiêu nhóm theo danh mục
        const query = `
            SELECT c.name as category, SUM(t.amount) as total
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = ? AND t.type = 'EXPENSE' AND MONTH(t.transaction_date) = ? AND YEAR(t.transaction_date) = ?
            GROUP BY c.name
        `;

        const [currentData] = await pool.query(query, [userId, currentMonth, currentYear]);
        const [prevData] = await pool.query(query, [userId, prevMonth, prevYear]);

        // Nếu cả 2 tháng đều không có dữ liệu
        if (currentData.length === 0 && prevData.length === 0) {
            return res.status(200).json({ 
                success: true, 
                analysis: "Bạn chưa có dữ liệu chi tiêu nào trong tháng này và tháng trước để phân tích cả! Hãy nhập thêm giao dịch nhé." 
            });
        }

        // Tạo Prompt cho AI (Nhắc AI đơn vị là Đài Tệ - NT$ vì bạn đang dùng tiền Đài)
        const prompt = `
        Bạn là một trợ lý tài chính cá nhân thông minh. Hãy phân tích tình hình chi tiêu của tôi.
        Đơn vị tiền tệ là Tân Đài Tệ (NT$).
        Dữ liệu chi tiêu tháng trước (${prevMonth}/${prevYear}): ${JSON.stringify(prevData)}
        Dữ liệu chi tiêu tháng này (${currentMonth}/${currentYear}): ${JSON.stringify(currentData)}

        Yêu cầu trả lời ngắn gọn, thân thiện bằng tiếng Việt theo format:
        1. So sánh tổng chi tiêu của 2 tháng.
        2. Tháng này tôi tiêu nhiều hơn (hoặc ít hơn) tháng trước cụ thể ở những khoản nào?
        3. Đưa ra 1-2 câu lời khuyên tài chính ngắn gọn. Không cần định dạng markdown quá phức tạp.
        `;

        // Gọi Google Gemini API
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Mình khuyên dùng gemini-3.5-flash vì nó là thế hệ mới, rất thông minh!
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ success: true, analysis: text });
    } catch (error) {
        console.error('Lỗi AI:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi gọi Trợ lý AI' });
    }
};

module.exports = { analyzeSpending };