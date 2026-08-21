import { useState, useEffect } from 'react';
import axios from 'axios';

const formatMoney = (amount) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0
  }).format(amount);
};

const Wallets = () => {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'add', 'edit'
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [formData, setFormData] = useState({ name: '', balance: 0 });

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/wallets');
        if (res.data.success) {
          setWallets(res.data.data);
        }
      } catch (error) {
        console.error('Lỗi lấy ví:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWallets();
  }, [refresh]);

  const openModal = (type, wallet = null) => {
    setModalType(type);
    setSelectedWallet(wallet);
    if (type === 'add') {
      setFormData({ name: '', balance: 0 });
    } else {
      setFormData({ name: wallet.name, balance: wallet.balance });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'add') {
        await axios.post('http://localhost:5000/api/wallets', formData);
      } else {
        await axios.put(`http://localhost:5000/api/wallets/${selectedWallet.id}`, formData);
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
        await axios.delete(`http://localhost:5000/api/wallets/${id}`);
        setRefresh(prev => prev + 1);
      } catch (error) {
        alert('Lỗi: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  if (loading) return <div className="text-center mt-10">Đang tải...</div>;

  // Tính tổng tài sản
  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Quản lý Ví tiền</h2>
        <button 
          onClick={() => openModal('add')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 shadow"
        >
          + Thêm Ví Mới
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 mb-8 text-white shadow-lg">
        <p className="text-blue-100 mb-1">Tổng tài sản hiện tại</p>
        <h3 className="text-4xl font-bold">{formatMoney(totalBalance)}</h3>
      </div>

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
              <h4 className="text-2xl font-bold text-gray-800">{formatMoney(wallet.balance)}</h4>
            </div>
          </div>
        ))}
        {wallets.length === 0 && <p className="text-gray-500 col-span-full">Bạn chưa có ví nào.</p>}
      </div>

      {/* MODAL THÊM / SỬA VÍ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {modalType === 'add' ? 'Thêm Ví Mới' : 'Sửa Thông Tin Ví'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tên Ví (Ngân hàng, Tiền mặt...)</label>
                <input type="text" className="w-full border p-2.5 rounded-lg outline-none" required
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Số dư hiện tại (NT$)</label>
                <input type="number" className="w-full border p-2.5 rounded-lg outline-none" required
                  value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">Hủy</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallets;