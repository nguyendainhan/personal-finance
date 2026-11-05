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

        // Gọi Google Gemini API (sử dụng gemini-2.5-flash, kèm cơ chế tự động phân tích nếu API key chưa hợp lệ)
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return res.status(200).json({ success: true, analysis: text });
        } catch (aiError) {
            console.warn('Không thể kết nối Gemini API, chuyển sang phân tích tự động nội bộ:', aiError.message);

            const sumTotal = (arr) => arr.reduce((sum, item) => sum + Number(item.total || 0), 0);
            const currentTotal = sumTotal(currentData);
            const prevTotal = sumTotal(prevData);
            const diff = currentTotal - prevTotal;

            const prevMap = Object.fromEntries(prevData.map(item => [item.category, Number(item.total)]));
            const currMap = Object.fromEntries(currentData.map(item => [item.category, Number(item.total)]));
            const allCategories = Array.from(new Set([...Object.keys(prevMap), ...Object.keys(currMap)]));

            const details = allCategories.map(cat => {
                const cVal = currMap[cat] || 0;
                const pVal = prevMap[cat] || 0;
                const dVal = cVal - pVal;
                if (dVal > 0) return `- ${cat}: tăng ${dVal.toLocaleString('vi-VN')} NT$ (tháng này ${cVal.toLocaleString('vi-VN')} NT$ vs tháng trước ${pVal.toLocaleString('vi-VN')} NT$)`;
                if (dVal < 0) return `- ${cat}: giảm ${Math.abs(dVal).toLocaleString('vi-VN')} NT$ (tháng này ${cVal.toLocaleString('vi-VN')} NT$ vs tháng trước ${pVal.toLocaleString('vi-VN')} NT$)`;
                return `- ${cat}: giữ nguyên ở mức ${cVal.toLocaleString('vi-VN')} NT$`;
            }).join('\n');

            const compareText = diff > 0
                ? `Tổng chi tiêu tháng ${currentMonth}/${currentYear} là ${currentTotal.toLocaleString('vi-VN')} NT$, tăng ${diff.toLocaleString('vi-VN')} NT$ so với tháng ${prevMonth}/${prevYear} (${prevTotal.toLocaleString('vi-VN')} NT$).`
                : diff < 0
                ? `Tổng chi tiêu tháng ${currentMonth}/${currentYear} là ${currentTotal.toLocaleString('vi-VN')} NT$, giảm ${Math.abs(diff).toLocaleString('vi-VN')} NT$ so với tháng ${prevMonth}/${prevYear} (${prevTotal.toLocaleString('vi-VN')} NT$).`
                : `Tổng chi tiêu hai tháng bằng nhau ở mức ${currentTotal.toLocaleString('vi-VN')} NT$.`;

            const topCategory = [...currentData].sort((a, b) => Number(b.total) - Number(a.total))[0];
            const adviceText = topCategory
                ? `Khoản chi lớn nhất tháng này là "${topCategory.category}" (${Number(topCategory.total).toLocaleString('vi-VN')} NT$). Bạn nên đặt hạn mức ngân sách cho danh mục này để kiểm soát dòng tiền tốt hơn.`
                : `Hãy tiếp tục ghi chép giao dịch đều đặn để theo dõi sát ngân sách hàng tháng nhé!`;

            const fallbackAnalysis = `1. So sánh tổng chi tiêu:\n${compareText}\n\n2. Chi tiết biến động theo danh mục:\n${details}\n\n3. Lời khuyên tài chính:\n${adviceText}`;
            return res.status(200).json({ success: true, analysis: fallbackAnalysis });
        }
    } catch (error) {
        console.error('Lỗi AI:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi gọi Trợ lý AI' });
    }
};

module.exports = { analyzeSpending };
