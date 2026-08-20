import { useState, useEffect, useRef } from 'react'; // <-- Thêm useRef
import axios from 'axios';
import * as XLSX from 'xlsx';

const formatMoney = (amount) => {
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
          axios.get(`http://localhost:5000/api/transactions?month=${selectedMonth}&year=${selectedYear}`),
          axios.get('http://localhost:5000/api/wallets'),
          axios.get('http://localhost:5000/api/categories')
        ]);

        if (txRes.data.success) setTransactions(txRes.data.data);
        if (walletsRes.data.success) {
          const fetchedWallets = walletsRes.data.data;
          setWallets(fetchedWallets);
          if (fetchedWallets.length > 0 && !formData.wallet_id) {
            setFormData(prev => ({ ...prev, wallet_id: fetchedWallets[0].id }));
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
      'Loại': tx.type === 'EXPENSE' ? 'Khoản chi (-)' : 'Khoản thu (+)',
      'Danh mục': tx.category_name || 'Khác',
      'Số tiền (TWD)': tx.type === 'EXPENSE' ? -Number(tx.amount) : Number(tx.amount),
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
          const amountRaw = Number(row['Số tiền (TWD)']);
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
          await axios.post('http://localhost:5000/api/transactions', payload);
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
      category_id: '',
      transaction_date: new Date().toISOString().split('T')[0]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        category_id: formData.category_id || (filteredCategories[0]?.id ?? null)
      };

      if (editingId) {
        await axios.put(`http://localhost:5000/api/transactions/${editingId}`, payload);
      } else {
        await axios.post('http://localhost:5000/api/transactions', payload);
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
        await axios.delete(`http://localhost:5000/api/transactions/${id}`);
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        alert('Lỗi khi xóa: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Lịch sử giao dịch</h2>
        
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
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm whitespace-nowrap flex items-center gap-2"
          >
            📤 Nhập Excel
          </button>

          {/* NÚT EXPORT */}
          <button 
            onClick={handleExportExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm whitespace-nowrap flex items-center gap-2"
          >
            📥 Xuất Excel
          </button>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm whitespace-nowrap"
          >
            + Thêm giao dịch
          </button>
        </div>
      </div>
      
      {/* --- PHẦN BẢNG --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b">
                  <th className="p-4 font-medium whitespace-nowrap">Ngày</th>
                  <th className="p-4 font-medium whitespace-nowrap">Danh mục</th>
                  <th className="p-4 font-medium whitespace-nowrap">Ví</th>
                  <th className="p-4 font-medium min-w-[150px]">Ghi chú</th>
                  <th className="p-4 font-medium text-right whitespace-nowrap">Số tiền (NT$)</th>
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
                        <span className="text-xl">{tx.category_icon || '🏷️'}</span>
                        <span className="font-medium" style={{ color: tx.category_color || '#374151' }}>
                          {tx.category_name || 'Khác'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 whitespace-nowrap">
                      {tx.wallet_name} {tx.to_wallet_name ? ` ➔ ${tx.to_wallet_name}` : ''}
                    </td>
                    <td className="p-4 text-gray-500 text-sm">{tx.note}</td>
                    <td className={`p-4 font-bold text-right whitespace-nowrap ${tx.type === 'EXPENSE' ? 'text-red-500' : tx.type === 'INCOME' ? 'text-green-500' : 'text-blue-500'}`}>
                      {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : ''}
                      {formatMoney(tx.amount)}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <button onClick={() => handleEdit(tx)} className="text-gray-400 hover:text-blue-500 transition mr-3">✏️</button>
                      <button onClick={() => handleDelete(tx.id)} className="text-gray-400 hover:text-red-500 transition">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Bạn chưa có giao dịch nào trong Tháng {selectedMonth}/{selectedYear}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODAL FORM GIỮ NGUYÊN --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{editingId ? 'Sửa giao dịch' : 'Thêm giao dịch mới'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại giao dịch</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value, category_id: ''})}
                >
                  <option value="EXPENSE">Khoản chi (-)</option>
                  <option value="INCOME">Khoản thu (+)</option>
                </select>
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (NTD / 元)</label>
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
                    <option key={w.id} value={w.id}>{w.name} (Dư: {formatMoney(w.balance)})</option>
                  ))}
                </select>
              </div>
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
                <button type="button" onClick={closeAndResetForm} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">Hủy</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">{editingId ? 'Cập nhật' : 'Lưu giao dịch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;