import { useState, useEffect } from 'react';
import axios from 'axios';

// Hàm format tiền Đài Loan (NT$)
const formatMoney = (amount) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0
  }).format(amount);
};

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Bộ lọc Tháng/Năm
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Quản lý Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    amount: ''
  });

  // Tải dữ liệu ngân sách và danh mục
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [budgetsRes, catRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/budgets?month=${selectedMonth}&year=${selectedYear}`),
          axios.get('http://localhost:5000/api/categories')
        ]);

        if (budgetsRes.data.success) setBudgets(budgetsRes.data.data);
        if (catRes.data.success) {
          // Chỉ lấy các danh mục thuộc loại CHI TIÊU (EXPENSE) để đặt ngân sách
          const expenseCats = catRes.data.data.filter(c => c.type === 'EXPENSE');
          setCategories(expenseCats);
          if (expenseCats.length > 0 && !formData.category_id) {
            setFormData(prev => ({ ...prev, category_id: expenseCats[0].id }));
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu ngân sách:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, selectedYear, refreshTrigger, formData.category_id]);

  // Hàm Mở form Sửa (Upsert)
  const handleEdit = (budget) => {
    setFormData({
      category_id: budget.category_id,
      amount: budget.budget_limit
    });
    setIsModalOpen(true);
  };

  // Hàm Lưu Ngân sách
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        month: selectedMonth,
        year: selectedYear
      };
      
      const response = await axios.post('http://localhost:5000/api/budgets', payload);
      if (response.data.success) {
        setIsModalOpen(false);
        setFormData({ ...formData, amount: '' });
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  // Hàm tính toán logic cho Thanh tiến trình
  const getProgressColor = (percentage) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 85) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      {/* HEADER TÍCH HỢP BỘ LỌC */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Quản lý Ngân sách</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <select 
              className="p-1 border-none outline-none bg-transparent font-medium text-gray-700 cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <div className="w-px bg-gray-300 my-1"></div>
            <select 
              className="p-1 border-none outline-none bg-transparent font-medium text-gray-700 cursor-pointer"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm whitespace-nowrap"
          >
            + Đặt ngân sách
          </button>
        </div>
      </div>

      {/* DANH SÁCH THẺ NGÂN SÁCH */}
      {loading ? (
        <div className="text-center mt-10 text-gray-500">Đang tải dữ liệu...</div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          Bạn chưa đặt hạn mức ngân sách nào cho Tháng {selectedMonth}/{selectedYear}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => {
            const limit = Number(budget.budget_limit);
            const spent = Number(budget.total_spent);
            const remaining = limit - spent;
            const rawPercentage = (spent / limit) * 100;
            // Ép % tối đa là 100 để thanh tiến trình không bị tràn khung
            const percentage = Math.min(rawPercentage, 100); 

            return (
              <div key={budget.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group">
                <button 
                  onClick={() => handleEdit(budget)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition"
                  title="Sửa ngân sách"
                >
                  ✏️
                </button>
                
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{budget.category_icon || '🏷️'}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{budget.category_name}</h3>
                    <p className="text-sm text-gray-500">Ngân sách: {formatMoney(limit)}</p>
                  </div>
                </div>

                <div className="mb-2 flex justify-between items-end">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Đã tiêu</p>
                    <p className="text-xl font-bold text-gray-800">{formatMoney(spent)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Còn lại</p>
                    <p className={`text-lg font-bold ${remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {remaining < 0 ? 'Vượt mức ' : ''}{formatMoney(Math.abs(remaining))}
                    </p>
                  </div>
                </div>

                {/* THANH TIẾN TRÌNH */}
                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(rawPercentage)}`} 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="text-right text-xs text-gray-500 font-medium">
                  {rawPercentage.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FORM THÊM/SỬA NGÂN SÁCH */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Đặt ngân sách (Tháng {selectedMonth}/{selectedYear})
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục chi tiêu</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền tối đa (NT$)</label>
                <input 
                  type="number" 
                  required min="1"
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="Ví dụ: 5000"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"
                >
                  Hủy
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">
                  Lưu ngân sách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;