import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatMoney = (amount) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0
  }).format(amount);
};

const Dashboard = () => {
  const [summary, setSummary] = useState({ totalBalance: 0, totalExpense: 0, totalIncome: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // --- THÊM STATE QUẢN LÝ TRỢ LÝ AI ---
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [walletsRes, txRes] = await Promise.all([
          axios.get('http://localhost:5000/api/wallets'),
          axios.get(`http://localhost:5000/api/transactions?month=${selectedMonth}&year=${selectedYear}`)
        ]);

        const wallets = walletsRes.data.success ? walletsRes.data.data : [];
        const transactions = txRes.data.success ? txRes.data.data : [];

        const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0);

        let totalExpense = 0;
        let totalIncome = 0;
        const expensesByCategory = {};

        transactions.forEach(tx => {
          const amount = Number(tx.amount);
          if (tx.type === 'EXPENSE') {
            totalExpense += amount;
            if (!expensesByCategory[tx.category_name]) {
              expensesByCategory[tx.category_name] = {
                name: tx.category_name || 'Khác',
                value: 0,
                color: tx.category_color || '#3b82f6'
              };
            }
            expensesByCategory[tx.category_name].value += amount;
          } else if (tx.type === 'INCOME') {
            totalIncome += amount;
          }
        });

        setSummary({ totalBalance, totalExpense, totalIncome });
        setChartData(Object.values(expensesByCategory));
        
        // Reset lại câu trả lời AI mỗi khi đổi tháng
        setAiResponse('');

      } catch (error) {
        console.error('Lỗi khi tải dữ liệu Dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedMonth, selectedYear]);

  // --- HÀM GỌI API PHÂN TÍCH AI ---
  const handleAskAI = async () => {
    setAiLoading(true);
    setAiResponse('');
    try {
      const response = await axios.get(`http://localhost:5000/api/ai/analyze?month=${selectedMonth}&year=${selectedYear}`);
      if (response.data.success) {
        setAiResponse(response.data.analysis);
      }
    } catch (error) {
      console.error(error);
      setAiResponse('Xin lỗi, tôi đang gặp trục trặc kết nối hoặc API Key bị lỗi. Vui lòng kiểm tra lại!');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Tổng quan tài chính</h2>
        
        <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <select 
            className="p-2 border-none outline-none bg-transparent font-medium text-gray-700 cursor-pointer"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <div className="w-px bg-gray-300 my-2"></div>
          <select 
            className="p-2 border-none outline-none bg-transparent font-medium text-gray-700 cursor-pointer"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
         <div className="text-center mt-10 text-gray-500">Đang tải dữ liệu...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
              <p className="text-gray-500 text-sm font-medium mb-1">Tổng tài sản (NT$)</p>
              <p className="text-3xl font-bold text-gray-800">{formatMoney(summary.totalBalance)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
              <p className="text-gray-500 text-sm font-medium mb-1">Thu nhập trong tháng</p>
              <p className="text-3xl font-bold text-green-600">{formatMoney(summary.totalIncome)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
              <p className="text-gray-500 text-sm font-medium mb-1">Chi tiêu trong tháng</p>
              <p className="text-3xl font-bold text-red-500">{formatMoney(summary.totalExpense)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* CỘT 1: BIỂU ĐỒ */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-700 mb-6">Cơ cấu chi tiêu tháng {selectedMonth}/{selectedYear}</h3>
              {chartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatMoney(value)} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-400">
                  Tháng này bạn chưa có khoản chi tiêu nào
                </div>
              )}
            </div>

            {/* CỘT 2: TRỢ LÝ AI (TÍNH NĂNG MỚI) */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl shadow-sm border border-indigo-100 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                  <span className="text-2xl">✨</span> Trợ lý AI Phân tích
                </h3>
                <button 
                  onClick={handleAskAI}
                  disabled={aiLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm flex items-center gap-2"
                >
                  {aiLoading ? 'Đang suy nghĩ...' : 'Phân tích ngay'}
                </button>
              </div>
              
              <div className="flex-1 bg-white/60 rounded-lg p-5 border border-indigo-100/50 backdrop-blur-sm">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-indigo-400 space-y-3">
                    <div className="animate-spin text-3xl">⚙️</div>
                    <p>Gemini đang đọc dữ liệu giao dịch của bạn...</p>
                  </div>
                ) : aiResponse ? (
                  <div className="prose prose-indigo max-w-none text-gray-700 text-base leading-relaxed whitespace-pre-line">
                    {aiResponse}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
                    <span className="text-4xl mb-3 opacity-50">🤖</span>
                    <p>Bấm nút phân tích để AI so sánh chi tiêu của tháng {selectedMonth} so với tháng {selectedMonth - 1 === 0 ? 12 : selectedMonth - 1} nhé!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;