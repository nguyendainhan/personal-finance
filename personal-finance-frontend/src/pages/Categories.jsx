import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const PRESET_ICONS = [
  '🍜', '☕', '🏠', '⛽', '🛒', '💊', '🎮', '✈️',
  '🎁', '📱', '💸', '💰', '🏦', '📈', '🎓', '🏷️'
];

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'
];

const renderIcon = (icon) => {
  if (!icon || String(icon).startsWith('fa-')) return '🏷️';
  return icon;
};

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [refresh, setRefresh] = useState(0);

  // States cho Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' hoặc 'edit'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE',
    icon: '🍜',
    color: '#3b82f6'
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_BASE}/categories`);
        if (res.data.success) setCategories(res.data.data);
      } catch (error) {
        console.error('Lỗi tải danh mục:', error);
      }
    };
    fetchCategories();
  }, [refresh]);

  // Hàm mở Modal
  const openModal = (type, category = null) => {
    setModalType(type);
    setSelectedCategory(category);
    if (type === 'add') {
      setFormData({
        name: '',
        type: 'EXPENSE',
        icon: '🍜',
        color: '#ef4444'
      });
    } else {
      setFormData({
        name: category.name,
        type: category.type,
        icon: renderIcon(category.icon),
        color: category.color || '#3b82f6'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'add') {
        await axios.post(`${API_BASE}/categories`, formData);
      } else {
        await axios.put(`${API_BASE}/categories/${selectedCategory.id}`, formData);
      }
      setIsModalOpen(false);
      setRefresh(prev => prev + 1);
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa danh mục này?')) {
      try {
        await axios.delete(`${API_BASE}/categories/${id}`);
        setRefresh(prev => prev + 1);
      } catch (error) {
        alert('Lỗi: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Quản lý Danh mục</h2>
        <button 
          onClick={() => openModal('add')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm sm:text-base font-medium hover:bg-blue-700 shadow-xs"
        >
          + Thêm Danh Mục
        </button>
      </div>

      {/* Bảng danh sách danh mục */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-600 text-xs sm:text-sm">
              <th className="p-3 sm:p-4">Danh Mục</th>
              <th className="p-3 sm:p-4 whitespace-nowrap">Màu sắc</th>
              <th className="p-3 sm:p-4 whitespace-nowrap">Loại Thu/Chi</th>
              <th className="p-3 sm:p-4 text-right whitespace-nowrap">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id} className="border-b hover:bg-gray-50">
                <td className="p-3 sm:p-4 font-medium text-gray-800 text-sm sm:text-base">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${cat.color || '#3b82f6'}18` }}
                    >
                      {renderIcon(cat.icon)}
                    </span>
                    <span style={{ color: cat.color || '#1f2937' }}>{cat.name}</span>
                  </div>
                </td>
                <td className="p-3 sm:p-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-full border border-black/10 inline-block"
                      style={{ backgroundColor: cat.color || '#3b82f6' }}
                    />
                    <span className="text-xs text-gray-500 hidden sm:inline">{cat.color || '#3b82f6'}</span>
                  </div>
                </td>
                <td className="p-3 sm:p-4 whitespace-nowrap">
                  <span className={`text-xs px-2.5 py-1 rounded font-bold ${cat.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {cat.type === 'INCOME' ? 'Thu nhập' : 'Chi tiêu'}
                  </span>
                </td>
                <td className="p-3 sm:p-4 text-right whitespace-nowrap">
                  <button onClick={() => openModal('edit', cat)} className="text-blue-500 hover:text-blue-700 text-xs sm:text-sm font-medium mr-3 sm:mr-4">
                    ✏️ <span className="hidden sm:inline">Sửa</span>
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:text-red-700 text-xs sm:text-sm font-medium">
                    🗑️ <span className="hidden sm:inline">Xóa</span>
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan="4" className="p-6 text-center text-gray-500">Chưa có danh mục nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL THÊM / SỬA DANH MỤC */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl my-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {modalType === 'add' ? 'Thêm Danh Mục' : 'Sửa Danh Mục'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tên danh mục (VD: Mua sắm, Tiền nhà...)</label>
                <input
                  type="text"
                  className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Loại</label>
                <select
                  className="w-full border p-2.5 rounded-lg outline-none bg-white focus:border-blue-500"
                  required
                  value={formData.type}
                  onChange={e => setFormData({
                    ...formData,
                    type: e.target.value,
                    color: e.target.value === 'INCOME' ? '#10b981' : '#ef4444'
                  })}
                >
                  <option value="EXPENSE">Khoản Chi (Expense)</option>
                  <option value="INCOME">Khoản Thu (Income)</option>
                </select>
              </div>

              {/* CHỌN ICON */}
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Biểu tượng (Icon)</label>
                <div className="grid grid-cols-8 gap-1.5 mb-2">
                  {PRESET_ICONS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                      className={`h-9 rounded-lg flex items-center justify-center text-lg border transition ${
                        formData.icon === emoji
                          ? 'border-blue-600 bg-blue-50 scale-105'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Hoặc nhập emoji bất kỳ:</span>
                  <input
                    type="text"
                    maxLength={4}
                    className="w-16 border p-1.5 rounded-lg text-center text-lg outline-none focus:border-blue-500"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  />
                </div>
              </div>

              {/* CHỌN MÀU SẮC */}
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Màu sắc hiển thị trên Biểu đồ</label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((hex) => (
                    <button
                      type="button"
                      key={hex}
                      onClick={() => setFormData({ ...formData, color: hex })}
                      className={`w-7 h-7 rounded-full transition transform ${
                        formData.color === hex ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                  <input
                    type="color"
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                    value={formData.color || '#3b82f6'}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    title="Chọn màu tùy chỉnh"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg">Hủy</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
