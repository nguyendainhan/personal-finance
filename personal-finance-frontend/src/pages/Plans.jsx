import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const formatMoney = (amount) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0
  }).format(amount);
};

const Plans = () => {
  const [activeTab, setActiveTab] = useState('SAVINGS'); // 'SAVINGS' hoặc 'DEBTS'
  const [savings, setSavings] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'addSaving', 'updateSaving', 'addDebt', 'updateDebt'
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [saveRes, debtRes] = await Promise.all([
          axios.get(`${API_BASE}/plans/savings`),
          axios.get(`${API_BASE}/plans/debts`)
        ]);
        if (saveRes.data.success) setSavings(saveRes.data.data);
        if (debtRes.data.success) setDebts(debtRes.data.data);
      } catch (error) {
        console.error('Lỗi tải dữ liệu:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refresh]);

  const openModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    
    // Khởi tạo dữ liệu form tùy theo hành động
    if (type === 'addSaving') {
      setFormData({ name: '', target_amount: '', target_date: '' });
    } else if (type === 'updateSaving') {
      setFormData({ saved_amount: item.saved_amount, status: item.status });
    } else if (type === 'addDebt') {
      setFormData({ name: '', type: 'BORROW', total_amount: '', due_date: '' });
    } else if (type === 'updateDebt') {
      setFormData({ paid_amount: item.paid_amount, status: item.status });
    }
    
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'addSaving') {
        await axios.post(`${API_BASE}/plans/savings`, formData);
      } else if (modalType === 'updateSaving') {
        await axios.put(`${API_BASE}/plans/savings/${selectedItem.id}`, formData);
      } else if (modalType === 'addDebt') {
        await axios.post(`${API_BASE}/plans/debts`, formData);
      } else if (modalType === 'updateDebt') {
        await axios.put(`${API_BASE}/plans/debts/${selectedItem.id}`, formData);
      }
      
      setIsModalOpen(false);
      setRefresh(prev => prev + 1);
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteSaving = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa mục tiêu tiết kiệm này?')) {
      try {
        await axios.delete(`${API_BASE}/plans/savings/${id}`);
        setRefresh(prev => prev + 1);
      } catch (error) {
        alert('Lỗi khi xóa: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleDeleteDebt = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa khoản nợ/cho vay này?')) {
      try {
        await axios.delete(`${API_BASE}/plans/debts/${id}`);
        setRefresh(prev => prev + 1);
      } catch (error) {
        alert('Lỗi khi xóa: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const calculateProgress = (current, total) => {
    if (!total || total == 0) return 0;
    const percent = (Number(current) / Number(total)) * 100;
    return Math.min(percent, 100).toFixed(1);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 sm:mb-6 gap-3 sm:gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Kế hoạch Tài chính</h2>
        <div className="flex w-full sm:w-auto bg-gray-200 p-1 rounded-lg">
          <button 
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-md text-sm sm:text-base font-medium transition ${activeTab === 'SAVINGS' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('SAVINGS')}
          >
            💰 Quỹ Tiết Kiệm
          </button>
          <button 
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-md text-sm sm:text-base font-medium transition ${activeTab === 'DEBTS' ? 'bg-white shadow-xs text-red-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('DEBTS')}
          >
            💳 Quản Lý Nợ
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-10 text-gray-500">Đang tải dữ liệu...</div>
      ) : (
        <>
          {/* GIAO DIỆN TAB TIẾT KIỆM */}
          {activeTab === 'SAVINGS' && (
            <div>
              <button onClick={() => openModal('addSaving')} className="w-full sm:w-auto mb-5 sm:mb-6 bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium hover:bg-blue-700">
                + Thêm mục tiêu tiết kiệm
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {savings.map(item => {
                  const percent = calculateProgress(item.saved_amount, item.target_amount);
                  return (
                    <div key={item.id} className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-gray-100">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.status === 'COMPLETED' ? (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold">Hoàn thành</span>
                          ) : (
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold">Đang tích lũy</span>
                          )}
                          <button
                            onClick={() => handleDeleteSaving(item.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition"
                            title="Xóa mục tiêu"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">Mục tiêu: {formatMoney(item.target_amount)} (Hạn: {new Date(item.target_date).toLocaleDateString('zh-TW')})</p>
                      
                      <div className="mb-1 flex justify-between text-sm font-medium">
                        <span className="text-gray-600">Đã gom: {formatMoney(item.saved_amount)}</span>
                        <span className="text-blue-600">{percent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                        <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${percent}%` }}></div>
                      </div>

                      <button onClick={() => openModal('updateSaving', item)} className="w-full border border-blue-500 text-blue-600 py-2 sm:py-1.5 rounded-lg hover:bg-blue-50 transition text-sm font-medium">
                        Cập nhật số dư
                      </button>
                    </div>
                  )
                })}
                {savings.length === 0 && <p className="text-gray-500 col-span-full">Chưa có mục tiêu tiết kiệm nào.</p>}
              </div>
            </div>
          )}

          {/* GIAO DIỆN TAB NỢ */}
          {activeTab === 'DEBTS' && (
            <div>
              <button onClick={() => openModal('addDebt')} className="w-full sm:w-auto mb-5 sm:mb-6 bg-red-600 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium hover:bg-red-700">
                + Thêm khoản nợ / Cho vay
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {debts.map(item => {
                  const percent = calculateProgress(item.paid_amount, item.total_amount);
                  const isBorrow = item.type === 'BORROW';
                  return (
                    <div key={item.id} className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-gray-100">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-xs px-2 py-1 rounded font-bold ${isBorrow ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                            {isBorrow ? 'Mình đi vay' : 'Cho người ta vay'}
                          </span>
                          <button
                            onClick={() => handleDeleteDebt(item.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition"
                            title="Xóa khoản nợ"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">Tổng tiền: {formatMoney(item.total_amount)} (Hạn chót: {new Date(item.due_date).toLocaleDateString('zh-TW')})</p>
                      
                      <div className="mb-1 flex justify-between text-sm font-medium">
                        <span className="text-gray-600">{isBorrow ? 'Đã trả:' : 'Đã đòi được:'} {formatMoney(item.paid_amount)}</span>
                        <span className={item.status === 'COMPLETED' ? 'text-green-600' : 'text-red-600'}>{percent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                        <div className={`${item.status === 'COMPLETED' ? 'bg-green-500' : 'bg-red-500'} h-2.5 rounded-full transition-all`} style={{ width: `${percent}%` }}></div>
                      </div>

                      <button onClick={() => openModal('updateDebt', item)} className="w-full border border-gray-300 text-gray-700 py-2 sm:py-1.5 rounded-lg hover:bg-gray-50 transition text-sm font-medium">
                        Cập nhật tiến độ
                      </button>
                    </div>
                  )
                })}
                {debts.length === 0 && <p className="text-gray-500 col-span-full">Tuyệt vời! Bạn không có khoản nợ nào.</p>}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL XỬ LÝ CHUNG */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {modalType === 'addSaving' && 'Thêm mục tiêu tiết kiệm'}
              {modalType === 'updateSaving' && 'Cập nhật tiền tiết kiệm'}
              {modalType === 'addDebt' && 'Thêm khoản nợ/cho vay'}
              {modalType === 'updateDebt' && 'Cập nhật tiến độ trả nợ'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Form Add Saving */}
              {modalType === 'addSaving' && (
                <>
                  <input type="text" placeholder="Tên mục tiêu (VD: Đổi điện thoại)" className="w-full border p-2.5 rounded-lg outline-none" required
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <input type="number" placeholder="Số tiền cần đạt (NT$)" className="w-full border p-2.5 rounded-lg outline-none" required min="1"
                    value={formData.target_amount} onChange={e => setFormData({...formData, target_amount: e.target.value})} />
                  <input type="date" className="w-full border p-2.5 rounded-lg outline-none" required
                    value={formData.target_date} onChange={e => setFormData({...formData, target_date: e.target.value})} />
                </>
              )}

              {/* Form Update Saving */}
              {modalType === 'updateSaving' && (
                <>
                  <label className="block text-sm text-gray-600 mb-1">Tổng tiền ĐÃ GOM ĐƯỢC đến hiện tại (NT$)</label>
                  <input type="number" className="w-full border p-2.5 rounded-lg outline-none" required min="0"
                    value={formData.saved_amount} onChange={e => setFormData({...formData, saved_amount: e.target.value})} />
                  <select className="w-full border p-2.5 rounded-lg outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="ONGOING">Đang tích lũy</option>
                    <option value="COMPLETED">Đã hoàn thành</option>
                  </select>
                </>
              )}

              {/* Form Add Debt */}
              {modalType === 'addDebt' && (
                <>
                  <input type="text" placeholder="Tên khoản (VD: Mượn bạn A)" className="w-full border p-2.5 rounded-lg outline-none" required
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <select className="w-full border p-2.5 rounded-lg outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="BORROW">Mình đi vay người ta</option>
                    <option value="LEND">Mình cho người ta vay</option>
                  </select>
                  <input type="number" placeholder="Tổng số tiền (NT$)" className="w-full border p-2.5 rounded-lg outline-none" required min="1"
                    value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: e.target.value})} />
                  <input type="date" className="w-full border p-2.5 rounded-lg outline-none" required
                    value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
                </>
              )}

              {/* Form Update Debt */}
              {modalType === 'updateDebt' && (
                <>
                  <label className="block text-sm text-gray-600 mb-1">Tổng tiền ĐÃ TRẢ / ĐÃ ĐÒI được (NT$)</label>
                  <input type="number" className="w-full border p-2.5 rounded-lg outline-none" required min="0"
                    value={formData.paid_amount} onChange={e => setFormData({...formData, paid_amount: e.target.value})} />
                  <select className="w-full border p-2.5 rounded-lg outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="ONGOING">Đang trả nợ</option>
                    <option value="COMPLETED">Đã thanh toán xong</option>
                  </select>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg">Hủy</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-gray-800 text-white rounded-lg">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Plans;
