import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatMoney = (amount, currency = 'TWD') => {
  if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  if (currency === 'USD') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount);
};

const Dashboard = () => {
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // === TÍNH NĂNG TỶ GIÁ NGOẠI TỆ ===
  const [rates, setRates] = useState({});
  const [baseCurrency, setBaseCurrency] = useState('TWD'); // Mặc định quy đổi tất cả ra Đài tệ

  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Tải Ví, Giao dịch và Tỷ giá cùng 1 lúc
        const [walletsRes, txRes, ratesRes] = await Promise.all([
          axios.get('http://localhost:5000/api/wallets'),
          axios.get(`http://localhost:5000/api/transactions?month=${selectedMonth}&year=${selectedYear}`),
          fetch('https://api.exchangerate-api.com/v4/latest/TWD').then(res => res.json())
        ]);

        if (walletsRes.data.success) setWallets(walletsRes.data.data);
        if (txRes.data.success) setTransactions(txRes.data.data);
        if (ratesRes.rates) setRates(ratesRes.rates);

        setAiResponse('');
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu Dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedMonth, selectedYear]);

  // === TÍNH TOÁN QUY ĐỔI TỰ ĐỘNG BẰNG USEMEMO ===
  const { grandTotal, totalIncome, totalExpense, chartData } = useMemo(() => {
    if (!rates[baseCurrency]) return { grandTotal: 0, totalIncome: 0, totalExpense: 0, chartData: [] };

    // 1. Tính tổng tài sản đã quy đổi
    let grandTotal = 0;
    wallets.forEach(w => {
      const curr = w.currency || 'TWD';
      const amount = Number(w.balance);
      if (rates[curr]) {
        grandTotal += (amount / rates[curr]) * rates[baseCurrency];
      }
    });

    // 2. Tính Tổng Thu/Chi và Biểu đồ chi tiêu đã quy đổi
    let totalIncome = 0;
    let totalExpense = 0;
    const expensesByCategory = {};

    transactions.forEach(tx => {
      const curr = tx.currency || 'TWD';
      const rawAmount = Number(tx.amount);
      
      // Quy đổi tiền giao dịch sang tiền gốc (baseCurrency)
      let convertedAmount = 0;
      if (rates[curr]) {
        convertedAmount = (rawAmount / rates[curr]) * rates[baseCurrency];
      }

      if (tx.type === 'INCOME') {
        totalIncome += convertedAmount;
      } else if (tx.type === 'EXPENSE') {
        totalExpense += convertedAmount;
        if (!expensesByCategory[tx.category_name]) {
          expensesByCategory[tx.category_name] = {
            name: tx.category_name || 'Khác',
            value: 0,
            color: tx.category_color || '#3b82f6'
          };
        }
        expensesByCategory[tx.category_name].value += convertedAmount;
      }
    });

    return {
      grandTotal,
      totalIncome,
      totalExpense,
      chartData: Object.values(expensesByCategory)
    };
  }, [wallets, transactions, rates, baseCurrency]);

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
      setAiResponse('Xin lỗi, tôi đang gặp trục trặc kết nối. Vui lòng kiểm tra lại!');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Tổng quan tài chính</h2>
        
        <div className="flex gap-4">
          {/* Ô chọn Tiền tệ gốc */}
          <select 
            className="p-2 border border-blue-200 rounded-lg outline-none bg-blue-50 text-blue-700 font-bold cursor-pointer"
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
          >
            <option value="TWD">Hiển thị bằng TWD</option>
            <option value="VND">Hiển thị bằng VND</option>
            <option value="USD">Hiển thị bằng USD</option>
          </select>

          {/* Ô chọn Tháng/Năm */}
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
      </div>

      {loading ? (
         <div className="text-center mt-10 text-gray-500">Đang tải dữ liệu và cập nhật tỷ giá...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
              <p className="text-gray-500 text-sm font-medium mb-1">Tổng tài sản quy đổi</p>
              <p className="text-3xl font-bold text-gray-800">{formatMoney(grandTotal, baseCurrency)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
              <p className="text-gray-500 text-sm font-medium mb-1">Thu nhập trong tháng</p>
              <p className="text-3xl font-bold text-green-600">{formatMoney(totalIncome, baseCurrency)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
              <p className="text-gray-500 text-sm font-medium mb-1">Chi tiêu trong tháng</p>
              <p className="text-3xl font-bold text-red-500">{formatMoney(totalExpense, baseCurrency)}</p>
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
                      <Tooltip formatter={(value) => formatMoney(value, baseCurrency)} />
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

            {/* CỘT 2: TRỢ LÝ AI */}
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
                    <p>Bấm nút phân tích để AI đánh giá chi tiêu của bạn nhé!</p>
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