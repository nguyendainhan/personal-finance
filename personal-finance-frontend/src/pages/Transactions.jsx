import { useState, useEffect, useRef } from 'react'; // <-- Thêm useRef
import axios from 'axios';
import * as XLSX from 'xlsx';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const formatMoney = (amount, currency = 'TWD') => {
  if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  if (currency === 'USD') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0
  }).format(amount);
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    type: 'EXPENSE',
    wallet_id: '',
    to_wallet_id: '',
    category_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    note: ''
  });

  // Tham chiếu đến thẻ input file ẩn
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [txRes, walletsRes, catRes] = await Promise.all([
          axios.get(`${API_BASE}/transactions?month=${selectedMonth}&year=${selectedYear}`),
          axios.get(`${API_BASE}/wallets`),
          axios.get(`${API_BASE}/categories`)
        ]);

        if (txRes.data.success) setTransactions(txRes.data.data);
        if (walletsRes.data.success) {
          const fetchedWallets = walletsRes.data.data;
          setWallets(fetchedWallets);
          if (fetchedWallets.length > 0 && !formData.wallet_id) {
            setFormData(prev => ({
              ...prev,
              wallet_id: fetchedWallets[0].id,
              to_wallet_id: fetchedWallets[1]?.id || ''
            }));
          }
        }
        if (catRes.data.success) {
          setCategories(catRes.data.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshTrigger, selectedMonth, selectedYear]);

  const filteredCategories = categories.filter(cat => cat.type === formData.type);
  const selectedWalletObj = wallets.find(w => String(w.id) === String(formData.wallet_id));
  const selectedCurrency = selectedWalletObj?.currency || 'TWD';

  // ==========================================
  // --- 1. HÀM XUẤT EXCEL ---
  // ==========================================
  const handleExportExcel = () => {
    if (transactions.length === 0) {
      alert('Không có dữ liệu để xuất trong tháng này!');
      return;
    }

    const excelData = transactions.map((tx, index) => ({
      'STT': index + 1,
      'Ngày giao dịch': new Date(tx.transaction_date).toLocaleDateString('zh-TW'),
      'Loại': tx.type === 'EXPENSE' ? 'Khoản chi (-)' : tx.type === 'INCOME' ? 'Khoản thu (+)' : 'Chuyển khoản (⇄)',
      'Danh mục': tx.type === 'TRANSFER' ? 'Chuyển khoản' : (tx.category_name || 'Khác'),
      'Số tiền': tx.type === 'EXPENSE' ? -Number(tx.amount) : Number(tx.amount),
      'Tiền tệ': tx.currency || 'TWD',
      'Ví': tx.wallet_name + (tx.to_wallet_name ? ` ➔ ${tx.to_wallet_name}` : ''),
      'Ghi chú': tx.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Tháng ${selectedMonth}-${selectedYear}`);
    XLSX.writeFile(workbook, `LichSuGiaoDich_${selectedMonth}_${selectedYear}.xlsx`);
  };

  // ==========================================
  // --- 2. HÀM NHẬP EXCEL ---
  // ==========================================
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        // Chuyển Sheet thành mảng JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          alert('File Excel trống!');
          return;
        }

        let successCount = 0;
        
        // Chạy vòng lặp đẩy từng dòng lên Backend
        for (const row of jsonData) {
          // Lấy số tiền và tự phân loại Thu/Chi dựa vào dấu âm/dương
          const amountRaw = Number(row['Số tiền'] ?? row['Số tiền (TWD)']);
          if (isNaN(amountRaw) || amountRaw === 0) continue; // Bỏ qua dòng rác

          const type = amountRaw < 0 ? 'EXPENSE' : 'INCOME';
          const amount = Math.abs(amountRaw);

          // Khớp tên Ví (bỏ phần text chuyển tiền nếu có)
          const walletName = row['Ví'] ? String(row['Ví']).split(' ➔ ')[0].trim() : '';
          const matchedWallet = wallets.find(w => w.name === walletName) || wallets[0];

          // Khớp tên Danh mục
          const catName = row['Danh mục'];
          const matchedCat = categories.find(c => c.name === catName) || categories[0];

          // Khớp ngày tháng
          let txDate = new Date().toISOString().split('T')[0];
          if (row['Ngày giao dịch']) {
            const parsedDate = new Date(row['Ngày giao dịch']);
            if (!isNaN(parsedDate)) {
              txDate = parsedDate.toISOString().split('T')[0];
            }
          }

          const payload = {
            amount,
            type,
            wallet_id: matchedWallet?.id,
            category_id: matchedCat?.id,
            transaction_date: txDate,
            note: row['Ghi chú'] || 'Import từ Excel'
          };

          // Gọi API POST
          await axios.post(`${API_BASE}/transactions`, payload);
          successCount++;
        }

        alert(`🎉 Đã nhập thành công ${successCount} giao dịch từ file Excel!`);
        setRefreshTrigger(prev => prev + 1); // Bóp cò để reload bảng và tổng tiền
      } catch (error) {
        console.error(error);
        alert('Có lỗi xảy ra khi đọc file Excel! Vui lòng đảm bảo file đúng định dạng.');
      }
      
      // Reset input để có thể click tải lại cùng 1 file nếu cần
      e.target.value = null; 
    };
    
    reader.readAsBinaryString(file);
  };

  // --- CÁC HÀM XỬ LÝ FORM CRUD CŨ ---
  const handleEdit = (tx) => {
    setFormData({
      amount: tx.amount,
      type: tx.type,
      wallet_id: tx.wallet_id,
      to_wallet_id: tx.to_wallet_id || '',
      category_id: tx.category_id || '',
      transaction_date: new Date(tx.transaction_date).toISOString().split('T')[0],
      note: tx.note || ''
    });
    setEditingId(tx.id); 
    setIsModalOpen(true);
  };

  const closeAndResetForm = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(prev => ({
      ...prev,
      amount: '',
      note: '',
      type: 'EXPENSE',
      to_wallet_id: wallets.find(w => String(w.id) !== String(prev.wallet_id))?.id || '',
      category_id: '',
      transaction_date: new Date().toISOString().split('T')[0]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        to_wallet_id: formData.type === 'TRANSFER' ? formData.to_wallet_id : null,
        category_id: formData.type === 'TRANSFER' ? null : (formData.category_id || (filteredCategories[0]?.id ?? null))
      };

      if (editingId) {
        await axios.put(`${API_BASE}/transactions/${editingId}`, payload);
      } else {
        await axios.post(`${API_BASE}/transactions`, payload);
      }
      closeAndResetForm();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
      try {
        await axios.delete(`${API_BASE}/transactions/${id}`);
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        alert('Lỗi khi xóa: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-5 sm:mb-6 gap-3 sm:gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Lịch sử giao dịch</h2>
        
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="col-span-2 sm:col-span-1 flex justify-center gap-2 bg-white px-3 py-2 rounded-lg shadow-xs border border-gray-200">
            <select 
              className="p-0.5 text-sm sm:text-base border-none outline-none bg-transparent font-medium text-gray-700 cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <div className="w-px bg-gray-300 my-1"></div>
            <select 
              className="p-0.5 text-sm sm:text-base border-none outline-none bg-transparent font-medium text-gray-700 cursor-pointer"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>

          {/* INPUT FILE ẨN */}
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
          />

          {/* NÚT IMPORT */}
          <button 
            onClick={() => fileInputRef.current.click()}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition shadow-xs whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            📤 Nhập Excel
          </button>

          {/* NÚT EXPORT */}
          <button 
            onClick={handleExportExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition shadow-xs whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            📥 Xuất Excel
          </button>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="col-span-2 sm:col-span-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition shadow-xs whitespace-nowrap text-center"
          >
            + Thêm giao dịch
          </button>
        </div>
      </div>
      
      {/* --- PHẦN DANH SÁCH GIAO DỊCH --- */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm sm:text-base">
            Bạn chưa có giao dịch nào trong Tháng {selectedMonth}/{selectedYear}.
          </div>
        ) : (
          <>
            {/* GIAO DIỆN THẺ TRÊN ĐIỆN THOẠI (Mobile Card View) */}
            <div className="divide-y divide-gray-100 md:hidden">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">
                      {tx.type === 'TRANSFER' ? '⇄' : (tx.category_icon || '🏷️')}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate" style={{ color: tx.category_color || '#1f2937' }}>
                        {tx.type === 'TRANSFER' ? 'Chuyển khoản' : (tx.category_name || 'Khác')}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {tx.wallet_name} {tx.to_wallet_name ? `➔ ${tx.to_wallet_name}` : ''} • {new Date(tx.transaction_date).toLocaleDateString('zh-TW')}
                      </p>
                      {tx.note && (
                        <p className="text-xs text-gray-400 mt-1 break-words">{tx.note}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end">
                    <span className={`font-bold text-sm sm:text-base whitespace-nowrap ${
                      tx.type === 'EXPENSE' ? 'text-red-500' : tx.type === 'INCOME' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : '⇄ '}
                      {formatMoney(tx.amount, tx.currency)}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleEdit(tx)}
                        className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:text-blue-600 active:bg-blue-50 text-xs"
                        aria-label="Sửa"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:text-red-600 active:bg-red-50 text-xs"
                        aria-label="Xóa"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* GIAO DIỆN BẢNG TRÊN MÁY TÍNH (Desktop Table View) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b">
                    <th className="p-4 font-medium whitespace-nowrap">Ngày</th>
                    <th className="p-4 font-medium whitespace-nowrap">Danh mục</th>
                    <th className="p-4 font-medium whitespace-nowrap">Ví</th>
                    <th className="p-4 font-medium min-w-[150px]">Ghi chú</th>
                    <th className="p-4 font-medium text-right whitespace-nowrap">Số tiền</th>
                    <th className="p-4 font-medium text-center whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-gray-50 transition">
                      <td className="p-4 text-gray-700 whitespace-nowrap">
                        {new Date(tx.transaction_date).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{tx.type === 'TRANSFER' ? '⇄' : (tx.category_icon || '🏷️')}</span>
                          <span className="font-medium" style={{ color: tx.category_color || '#374151' }}>
                            {tx.type === 'TRANSFER' ? 'Chuyển khoản' : (tx.category_name || 'Khác')}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 whitespace-nowrap">
                        {tx.wallet_name} {tx.to_wallet_name ? ` ➔ ${tx.to_wallet_name}` : ''}
                      </td>
                      <td className="p-4 text-gray-500 text-sm">{tx.note}</td>
                      <td className={`p-4 font-bold text-right whitespace-nowrap ${tx.type === 'EXPENSE' ? 'text-red-500' : tx.type === 'INCOME' ? 'text-green-500' : 'text-blue-500'}`}>
                        {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : '⇄ '}
                        {formatMoney(tx.amount, tx.currency)}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <button onClick={() => handleEdit(tx)} className="text-gray-400 hover:text-blue-500 transition mr-3">✏️</button>
                        <button onClick={() => handleDelete(tx.id)} className="text-gray-400 hover:text-red-500 transition">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* --- MODAL FORM --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl my-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{editingId ? 'Sửa giao dịch' : 'Thêm giao dịch mới'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại giao dịch</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                  value={formData.type}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    const defaultToWallet = wallets.find(w => String(w.id) !== String(formData.wallet_id))?.id || '';
                    setFormData({
                      ...formData,
                      type: nextType,
                      category_id: '',
                      to_wallet_id: nextType === 'TRANSFER' ? (formData.to_wallet_id || defaultToWallet) : ''
                    });
                  }}
                >
                  <option value="EXPENSE">Khoản chi (-)</option>
                  <option value="INCOME">Khoản thu (+)</option>
                  <option value="TRANSFER">Chuyển khoản giữa các ví (⇄)</option>
                </select>
              </div>
              {formData.type !== 'TRANSFER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    required
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {filteredCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền ({selectedCurrency})</label>
                <input 
                  type="number" 
                  required min="1"
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Từ ví</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                  value={formData.wallet_id}
                  onChange={(e) => setFormData({...formData, wallet_id: e.target.value})}
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name} (Dư: {formatMoney(w.balance, w.currency)})</option>
                  ))}
                </select>
              </div>
              {formData.type === 'TRANSFER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đến ví nhận</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                    value={formData.to_wallet_id}
                    onChange={(e) => setFormData({...formData, to_wallet_id: e.target.value})}
                    required
                  >
                    <option value="">-- Chọn ví nhận --</option>
                    {wallets
                      .filter(w => String(w.id) !== String(formData.wallet_id))
                      .map(w => (
                        <option key={w.id} value={w.id}>{w.name} (Dư: {formatMoney(w.balance, w.currency)})</option>
                      ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày giao dịch</label>
                <input 
                  type="date" 
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({...formData, transaction_date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={closeAndResetForm} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg">Hủy</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg">{editingId ? 'Cập nhật' : 'Lưu giao dịch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
