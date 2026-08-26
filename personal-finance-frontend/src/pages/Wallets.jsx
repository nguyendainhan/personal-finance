import { useState, useEffect } from 'react';
import axios from 'axios';

// Hàm định dạng tiền tệ
const formatMoney = (amount, currency = 'TWD') => {
  if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  if (currency === 'USD') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount);
};

const Wallets = () => {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  // States cho Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [formData, setFormData] = useState({ name: '', balance: 0, currency: 'TWD' });

  // === TÍNH NĂNG TỶ GIÁ NGOẠI TỆ ===
  const [rates, setRates] = useState({});
  const [baseCurrency, setBaseCurrency] = useState('TWD'); // Mặc định quy đổi tất cả ra Đài tệ

  useEffect(() => {
    // 1. Lấy danh sách Ví
    const fetchWallets = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/wallets`);
        if (res.data.success) setWallets(res.data.data);
      } catch (error) {
        console.error('Lỗi lấy ví:', error);
      } finally {
        setLoading(false);
      }
    };

    // 2. Lấy Tỷ giá thực tế (Lấy TWD làm gốc)
    const fetchRates = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/TWD');
        const data = await res.json();
        setRates(data.rates);
      } catch (error) {
        console.error('Lỗi lấy tỷ giá:', error);
      }
    };
    
    fetchWallets();
    fetchRates();
  }, [refresh]);

  const openModal = (type, wallet = null) => {
    setModalType(type);
    setSelectedWallet(wallet);
    if (type === 'add') {
      setFormData({ name: '', balance: 0, currency: 'TWD' });
    } else {
      setFormData({ name: wallet.name, balance: wallet.balance, currency: wallet.currency || 'TWD' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'add') {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/wallets`, formData);
      } else {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/wallets/${selectedWallet.id}`, formData);
      }
      setIsModalOpen(false);
      setRefresh(prev => prev + 1);
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa ví này không?')) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/wallets/${id}`);
        setRefresh(prev => prev + 1);
      } catch (error) {
        alert('Lỗi: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  if (loading) return <div className="text-center mt-10">Đang tải...</div>;

  // === TÍNH TOÁN TỔNG TÀI SẢN THEO TỪNG LOẠI TIỀN ===
  const totalsByCurrency = wallets.reduce((acc, wallet) => {
    const curr = wallet.currency || 'TWD';
    acc[curr] = (acc[curr] || 0) + Number(wallet.balance);
    return acc;
  }, {});

  // === TÍNH TOÁN QUY ĐỔI TẤT CẢ TÀI SẢN (GRAND TOTAL) ===
  let grandTotal = 0;
  if (Object.keys(rates).length > 0) {
    wallets.forEach(w => {
      const curr = w.currency || 'TWD';
      const amount = Number(w.balance);
      // Công thức: (Tiền / Tỷ giá của tiền đó) * Tỷ giá của tiền muốn quy đổi
      if (rates[curr] && rates[baseCurrency]) {
        grandTotal += (amount / rates[curr]) * rates[baseCurrency];
      }
    });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Quản lý Ví tiền</h2>
        <button onClick={() => openModal('add')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 shadow">
          + Thêm Ví Mới
        </button>
      </div>

      {/* KHU VỰC HIỂN THỊ TỔNG TÀI SẢN */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 mb-8 text-white shadow-xl relative overflow-hidden">
        {/* Nút chọn tiền tệ quy đổi ở góc phải */}
        <div className="absolute top-6 right-6">
          <select 
            className="bg-white/20 text-white border border-white/40 rounded-lg px-3 py-1.5 outline-none cursor-pointer backdrop-blur-sm"
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
          >
            <option value="TWD" className="text-gray-800">Quy đổi ra Đài tệ (TWD)</option>
            <option value="VND" className="text-gray-800">Quy đổi ra Tiền Việt (VND)</option>
            <option value="USD" className="text-gray-800">Quy đổi ra Đô la (USD)</option>
          </select>
        </div>

        {/* Tổng tài sản đã quy đổi */}
        <div className="mb-6">
          <p className="text-blue-100 mb-1 font-medium">Tổng tài sản (Quy đổi theo tỷ giá thực tế)</p>
          <h3 className="text-5xl font-bold tracking-tight">
            {Object.keys(rates).length > 0 ? formatMoney(grandTotal, baseCurrency) : 'Đang cập nhật tỷ giá...'}
          </h3>
        </div>

        {/* Tách riêng từng ví */}
        <div className="flex flex-wrap gap-x-12 gap-y-4 pt-4 border-t border-white/20">
          {Object.entries(totalsByCurrency).map(([curr, total]) => (
            <div key={curr}>
              <p className="text-blue-200 text-sm mb-1 uppercase tracking-wider">Tổng ({curr})</p>
              <h4 className="text-xl font-semibold">{formatMoney(total, curr)}</h4>
            </div>
          ))}
        </div>
      </div>

      {/* DANH SÁCH VÍ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.map(wallet => (
          <div key={wallet.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg text-xl">💳</div>
                <div className="flex gap-2">
                  <button onClick={() => openModal('edit', wallet)} className="text-gray-400 hover:text-blue-600">✏️</button>
                  <button onClick={() => handleDelete(wallet.id)} className="text-gray-400 hover:text-red-600">🗑️</button>
                </div>
              </div>
              <p className="text-gray-500 text-sm mb-1">{wallet.name}</p>
              <h4 className="text-2xl font-bold text-gray-800">{formatMoney(wallet.balance, wallet.currency)}</h4>
            </div>
          </div>
        ))}
        {wallets.length === 0 && <p className="text-gray-500 col-span-full text-center py-10">Bạn chưa có ví nào.</p>}
      </div>

      {/* MODAL THÊM / SỬA VÍ (Giữ nguyên) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {modalType === 'add' ? 'Thêm Ví Mới' : 'Sửa Thông Tin Ví'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tên Ví (Ngân hàng, Tiền mặt...)</label>
                <input type="text" className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500" required
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Loại tiền tệ</label>
                <select className="w-full border p-2.5 rounded-lg outline-none bg-white focus:border-blue-500" required
                  value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                  <option value="TWD">Đài tệ (TWD)</option>
                  <option value="VND">Việt Nam Đồng (VND)</option>
                  <option value="USD">Đô la Mỹ (USD)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Số dư hiện tại</label>
                <input type="number" className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500" required
                  value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition">Hủy</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallets;