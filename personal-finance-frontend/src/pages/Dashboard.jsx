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

  // Thêm State quản lý Tháng và Năm hiện tại
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Truyền params month và year vào API transactions
        const [walletsRes, txRes] = await Promise.all([
          axios.get('http://localhost:5000/api/wallets'),
          axios.get(`http://localhost:5000/api/transactions?month=${selectedMonth}&year=${selectedYear}`)
        ]);

        const wallets = walletsRes.data.success ? walletsRes.data.data : [];
        const transactions = txRes.data.success ? txRes.data.data : [];

        // Tổng tài sản luôn là tổng tất cả các ví (không phụ thuộc tháng)
        const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0);

        // Tính Thu/Chi và vẽ biểu đồ DỰA TRÊN DỮ LIỆU CỦA THÁNG ĐÃ CHỌN
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

      } catch (error) {
        console.error('Lỗi khi tải dữ liệu Dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedMonth, selectedYear]); // Chạy lại API khi đổi tháng hoặc năm

  return (
    <div>
      {/* HEADER CÓ THÊM BỘ LỌC */}
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
        </>
      )}
    </div>
  );
};

export default Dashboard;