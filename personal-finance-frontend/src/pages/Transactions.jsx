import { useState, useEffect, useRef, useMemo } from 'react';
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

const renderIcon = (icon) => {
  if (!icon || String(icon).startsWith('fa-')) return '🏷️';
  return icon;
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rates, setRates] = useState({ TWD: 1, VND: 780, USD: 0.031 });
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // === BỘ LỌC TÌM KIẾM NHANH ===
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWallet, setFilterWallet] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [manualToAmount, setManualToAmount] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    to_amount: '',
    type: 'EXPENSE',
    wallet_id: '',
    to_wallet_id: '',
    category_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    note: ''
  });

  // Tham chiếu đến thẻ input file ẩn
  const fileInputRef = useRef(null);

  // Hàm tính quy đổi tự động theo tỷ giá thực tế
  const computeConvertedWithRates = (rawAmount, fromCurr, toCurr, currentRates) => {
    const num = Number(rawAmount);
    if (!num || isNaN(num)) return '';
    if (fromCurr === toCurr) return String(num);
    if (currentRates[fromCurr] && currentRates[toCurr]) {
      const converted = (num / currentRates[fromCurr]) * currentRates[toCurr];
      return toCurr === 'USD' ? String(Number(converted.toFixed(2))) : String(Math.round(converted));
    }
    return String(num);
  };

  const computeConvertedAmount = (rawAmount, fromCurr, toCurr) =>
    computeConvertedWithRates(rawAmount, fromCurr, toCurr, rates);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [txRes, walletsRes, catRes, ratesRes] = await Promise.all([
          axios.get(`${API_BASE}/transactions?month=${selectedMonth}&year=${selectedYear}`),
          axios.get(`${API_BASE}/wallets`),
          axios.get(`${API_BASE}/categories`),
          fetch('https://api.exchangerate-api.com/v4/latest/TWD').then(res => res.json()).catch(() => ({}))
        ]);

        const activeRates = ratesRes?.rates || rates;
        if (ratesRes?.rates) {
          setRates(ratesRes.rates);
        }

        const fetchedTxs = txRes.data.success ? txRes.data.data : [];
        let fetchedWallets = walletsRes.data.success ? walletsRes.data.data : [];

        // Tự động đồng bộ số dư ví nhận nếu giao dịch chuyển khoản khác tiền tệ trước đó chỉ mới cộng số tiền gốc (VD: 20,000 TWD -> 20,000 VND)
        for (const tx of fetchedTxs) {
          if (tx.type === 'TRANSFER' && tx.to_wallet_id) {
            const fromW = fetchedWallets.find(w => String(w.id) === String(tx.wallet_id));
            const toW = fetchedWallets.find(w => String(w.id) === String(tx.to_wallet_id));
            if (fromW && toW && fromW.currency !== toW.currency) {
              const rawAmt = Number(tx.amount);
              const curBal = Number(toW.balance);
              if (rawAmt > 0 && curBal === rawAmt) {
                const savedCustom = Number(localStorage.getItem(`tx_to_amount_${tx.id}`));
                const converted = savedCustom > 0
                  ? savedCustom
                  : Number(computeConvertedWithRates(rawAmt, fromW.currency, toW.currency, activeRates));
                if (converted > 0 && converted !== rawAmt) {
                  await axios.put(`${API_BASE}/wallets/${toW.id}`, {
                    name: toW.name,
                    balance: converted,
                    currency: toW.currency
                  });
                  fetchedWallets = fetchedWallets.map(w =>
                    String(w.id) === String(toW.id) ? { ...w, balance: converted } : w
                  );
                }
              }
            }
          }
        }

        setTransactions(fetchedTxs);
        setWallets(fetchedWallets);
        if (fetchedWallets.length > 0 && !formData.wallet_id) {
          setFormData(prev => ({
            ...prev,
            wallet_id: fetchedWallets[0].id,
            to_wallet_id: fetchedWallets[1]?.id || ''
          }));
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

  const targetWalletObj = wallets.find(w => String(w.id) === String(formData.to_wallet_id));
  const targetCurrency = targetWalletObj?.currency || selectedCurrency;
  const isCrossCurrencyTransfer = formData.type === 'TRANSFER' && formData.to_wallet_id && selectedCurrency !== targetCurrency;

  // Tự động cập nhật to_amount khi người dùng nhập amount hoặc đổi ví (nếu chưa sửa tay to_amount)
  useEffect(() => {
    if (formData.type === 'TRANSFER' && !manualToAmount) {
      const autoVal = computeConvertedAmount(formData.amount, selectedCurrency, targetCurrency);
      setFormData(prev => ({ ...prev, to_amount: autoVal }));
    }
  }, [formData.amount, formData.type, selectedCurrency, targetCurrency, rates, manualToAmount]);

  // Tỷ giá tham khảo 1 đơn vị ví gửi = ? đơn vị ví nhận
  const exchangeRateHint = useMemo(() => {
    if (!isCrossCurrencyTransfer || !rates[selectedCurrency] || !rates[targetCurrency]) return null;
    const oneUnit = (1 / rates[selectedCurrency]) * rates[targetCurrency];
    const formatted = targetCurrency === 'USD' ? oneUnit.toFixed(4) : Math.round(oneUnit).toLocaleString('vi-VN');
    return `1 ${selectedCurrency} ≈ ${formatted} ${targetCurrency}`;
  }, [isCrossCurrencyTransfer, rates, selectedCurrency, targetCurrency]);

  // Lấy số tiền thực nhận của 1 giao dịch chuyển khoản
  const getEffectiveReceivedAmount = (tx) => {
    const fromWall = wallets.find(w => String(w.id) === String(tx.wallet_id));
    const toWall = wallets.find(w => String(w.id) === String(tx.to_wallet_id));
    const fromCurr = tx.currency || fromWall?.currency || 'TWD';
    const toCurr = tx.to_currency || toWall?.currency || fromCurr;

    if (tx.to_amount && Number(tx.to_amount) > 0 && !(fromCurr !== toCurr && Number(tx.to_amount) === Number(tx.amount))) {
      return Number(tx.to_amount);
    }
    const savedLocal = Number(localStorage.getItem(`tx_to_amount_${tx.id}`));
    if (savedLocal > 0) return savedLocal;
    if (fromCurr !== toCurr) {
      return Number(computeConvertedAmount(tx.amount, fromCurr, toCurr)) || Number(tx.amount);
    }
    return Number(tx.amount);
  };

  // === LỌC DANH SÁCH GIAO DỊCH THEO TỪ KHÓA, VÍ, LOẠI, DANH MỤC ===
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType !== 'ALL' && tx.type !== filterType) return false;
      if (
        filterWallet !== 'ALL' &&
        String(tx.wallet_id) !== String(filterWallet) &&
        String(tx.to_wallet_id) !== String(filterWallet)
      ) {
        return false;
      }
      if (filterCategory !== 'ALL' && String(tx.category_id) !== String(filterCategory)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNote = (tx.note || '').toLowerCase().includes(q);
        const matchCat = (tx.category_name || '').toLowerCase().includes(q);
        const matchWallet = (tx.wallet_name || '').toLowerCase().includes(q);
        const matchAmount = String(tx.amount || '').includes(q);
        if (!matchNote && !matchCat && !matchWallet && !matchAmount) return false;
      }
      return true;
    });
  }, [transactions, filterType, filterWallet, filterCategory, searchQuery]);

  const isFiltering =
    searchQuery.trim() !== '' ||
    filterWallet !== 'ALL' ||
    filterType !== 'ALL' ||
    filterCategory !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterWallet('ALL');
    setFilterType('ALL');
    setFilterCategory('ALL');
  };

  // ==========================================
  // --- 1. HÀM XUẤT EXCEL ---
  // ==========================================
  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      alert('Không có dữ liệu để xuất!');
      return;
    }

    const excelData = filteredTransactions.map((tx, index) => {
      const fromWall = wallets.find(w => String(w.id) === String(tx.wallet_id));
      const toWall = wallets.find(w => String(w.id) === String(tx.to_wallet_id));
      const fromCurr = tx.currency || fromWall?.currency || 'TWD';
      const toCurr = tx.to_currency || toWall?.currency || fromCurr;
      return {
        'STT': index + 1,
        'Ngày giao dịch': new Date(tx.transaction_date).toLocaleDateString('zh-TW'),
        'Loại': tx.type === 'EXPENSE' ? 'Khoản chi (-)' : tx.type === 'INCOME' ? 'Khoản thu (+)' : 'Chuyển khoản (⇄)',
        'Danh mục': tx.type === 'TRANSFER' ? 'Chuyển khoản' : (tx.category_name || 'Khác'),
        'Số tiền': tx.type === 'EXPENSE' ? -Number(tx.amount) : Number(tx.amount),
        'Tiền tệ': fromCurr,
        'Số tiền ví nhận': tx.type === 'TRANSFER' ? getEffectiveReceivedAmount(tx) : '',
        'Tiền tệ ví nhận': tx.type === 'TRANSFER' ? toCurr : '',
        'Ví': tx.wallet_name + (tx.to_wallet_name ? ` ➔ ${tx.to_wallet_name}` : ''),
        'Ghi chú': tx.note || ''
      };
    });

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
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          alert('File Excel trống!');
          return;
        }

        let successCount = 0;
        
        for (const row of jsonData) {
          const amountRaw = Number(row['Số tiền'] ?? row['Số tiền (TWD)']);
          if (isNaN(amountRaw) || amountRaw === 0) continue;

          const type = amountRaw < 0 ? 'EXPENSE' : 'INCOME';
          const amount = Math.abs(amountRaw);

          const walletName = row['Ví'] ? String(row['Ví']).split(' ➔ ')[0].trim() : '';
          const matchedWallet = wallets.find(w => w.name === walletName) || wallets[0];

          const catName = row['Danh mục'];
          const matchedCat = categories.find(c => c.name === catName) || categories[0];

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

          await axios.post(`${API_BASE}/transactions`, payload);
          successCount++;
        }

        alert(`🎉 Đã nhập thành công ${successCount} giao dịch từ file Excel!`);
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error(error);
        alert('Có lỗi xảy ra khi đọc file Excel! Vui lòng đảm bảo file đúng định dạng.');
      }
      
      e.target.value = null; 
    };
    
    reader.readAsBinaryString(file);
  };

  // --- CÁC HÀM XỬ LÝ FORM CRUD ---
  const handleEdit = (tx) => {
    const fromWall = wallets.find(w => String(w.id) === String(tx.wallet_id));
    const toWall = wallets.find(w => String(w.id) === String(tx.to_wallet_id));
    const fromCurr = tx.currency || fromWall?.currency || 'TWD';
    const toCurr = tx.to_currency || toWall?.currency || fromCurr;
    const cleanAmount = Number(tx.amount);
    const savedLocal = Number(localStorage.getItem(`tx_to_amount_${tx.id}`));
    const cleanToAmount = tx.to_amount ? Number(tx.to_amount) : savedLocal;

    const hasSavedCustomToAmount =
      cleanToAmount > 0 &&
      !(fromCurr !== toCurr && cleanToAmount === cleanAmount);

    setManualToAmount(Boolean(hasSavedCustomToAmount));
    setFormData({
      amount: String(cleanAmount),
      to_amount: hasSavedCustomToAmount
        ? String(cleanToAmount)
        : computeConvertedAmount(cleanAmount, fromCurr, toCurr),
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
    setManualToAmount(false);
    setFormData(prev => ({
      ...prev,
      amount: '',
      to_amount: '',
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
      const cleanAmount = Number(formData.amount);
      const finalToAmount = formData.type === 'TRANSFER'
        ? Number(
            isCrossCurrencyTransfer
              ? (formData.to_amount || computeConvertedAmount(cleanAmount, selectedCurrency, targetCurrency))
              : cleanAmount
          )
        : null;

      const payload = {
        ...formData,
        amount: cleanAmount,
        to_wallet_id: formData.type === 'TRANSFER' ? formData.to_wallet_id : null,
        to_amount: finalToAmount,
        category_id: formData.type === 'TRANSFER' ? null : (formData.category_id || (filteredCategories[0]?.id ?? null))
      };

      if (editingId) {
        const oldTx = transactions.find(t => String(t.id) === String(editingId));
        const res = await axios.put(`${API_BASE}/transactions/${editingId}`, payload);

        if (formData.type === 'TRANSFER' && finalToAmount) {
          localStorage.setItem(`tx_to_amount_${editingId}`, String(finalToAmount));
        }

        // Nếu Backend trên Render chưa kịp cập nhật bản mới (không trả về to_amount), Frontend chủ động đồng bộ số dư Ví qua API /wallets/:id
        if (formData.type === 'TRANSFER' && targetWalletObj && res.data?.to_amount === undefined) {
          const oldAmount = oldTx ? Number(oldTx.amount) : cleanAmount;
          const curTargetBalance = Number(targetWalletObj.balance);
          const oldAddedToTarget = curTargetBalance === oldAmount
            ? oldAmount
            : (oldTx ? getEffectiveReceivedAmount(oldTx) : oldAmount);

          const nextTargetBalance = curTargetBalance - oldAddedToTarget + finalToAmount;
          await axios.put(`${API_BASE}/wallets/${targetWalletObj.id}`, {
            name: targetWalletObj.name,
            balance: nextTargetBalance,
            currency: targetWalletObj.currency
          });

          if (oldTx && selectedWalletObj && String(oldTx.wallet_id) === String(selectedWalletObj.id) && oldAmount !== cleanAmount) {
            const nextSourceBalance = Number(selectedWalletObj.balance) + oldAmount - cleanAmount;
            await axios.put(`${API_BASE}/wallets/${selectedWalletObj.id}`, {
              name: selectedWalletObj.name,
              balance: nextSourceBalance,
              currency: selectedWalletObj.currency
            });
          }
        }
      } else {
        const res = await axios.post(`${API_BASE}/transactions`, payload);
        const createdId = res.data?.data?.id;
        if (createdId && formData.type === 'TRANSFER' && finalToAmount) {
          localStorage.setItem(`tx_to_amount_${createdId}`, String(finalToAmount));
        }

        // Nếu Backend trên Render chưa trả về to_amount (chỉ mới cộng cleanAmount vào ví nhận), Frontend cập nhật lại đúng số tiền quy đổi cho ví nhận
        if (
          formData.type === 'TRANSFER' &&
          isCrossCurrencyTransfer &&
          targetWalletObj &&
          res.data?.data?.to_amount === undefined
        ) {
          const nextTargetBalance = Number(targetWalletObj.balance) + finalToAmount;
          await axios.put(`${API_BASE}/wallets/${targetWalletObj.id}`, {
            name: targetWalletObj.name,
            balance: nextTargetBalance,
            currency: targetWalletObj.currency
          });
        }
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
        const tx = transactions.find(t => String(t.id) === String(id));
        const res = await axios.delete(`${API_BASE}/transactions/${id}`);

        if (tx && tx.type === 'TRANSFER' && tx.to_wallet_id && res.data?.reverted_to_amount === undefined) {
          const fromWall = wallets.find(w => String(w.id) === String(tx.wallet_id));
          const toWall = wallets.find(w => String(w.id) === String(tx.to_wallet_id));
          if (fromWall && toWall && fromWall.currency !== toWall.currency) {
            const received = getEffectiveReceivedAmount(tx);
            const expectedRemaining = Math.max(0, Number(toWall.balance) - received);
            await axios.put(`${API_BASE}/wallets/${toWall.id}`, {
              name: toWall.name,
              balance: expectedRemaining,
              currency: toWall.currency
            });
          }
        }
        localStorage.removeItem(`tx_to_amount_${id}`);
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        alert('Lỗi khi xóa: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  // Hiển thị số tiền giao dịch (nếu chuyển khoản khác ngoại tệ thì hiện cả số tiền trừ và số tiền nhận)
  const renderTransactionAmount = (tx) => {
    const fromWall = wallets.find(w => String(w.id) === String(tx.wallet_id));
    const toWall = wallets.find(w => String(w.id) === String(tx.to_wallet_id));
    const fromCurr = tx.currency || fromWall?.currency || 'TWD';
    const toCurr = tx.to_currency || toWall?.currency || fromCurr;

    if (tx.type === 'TRANSFER' && toCurr !== fromCurr) {
      const received = getEffectiveReceivedAmount(tx);
      return (
        <div className="flex flex-col items-end">
          <span className="text-red-500 text-xs sm:text-sm">-{formatMoney(tx.amount, fromCurr)}</span>
          <span className="text-green-600 text-sm sm:text-base font-bold">+{formatMoney(received, toCurr)}</span>
        </div>
      );
    }
    return (
      <span>
        {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : '⇄ '}
        {formatMoney(tx.amount, fromCurr)}
      </span>
    );
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 sm:mb-5 gap-3 sm:gap-4">
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

      {/* --- THANH TÌM KIẾM & LỌC NHANH --- */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-gray-100 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Ô tìm kiếm từ khóa */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Tìm ghi chú, danh mục, số tiền..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Lọc theo Ví */}
          <select
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white focus:border-blue-500 cursor-pointer"
            value={filterWallet}
            onChange={(e) => setFilterWallet(e.target.value)}
          >
            <option value="ALL">🏦 Tất cả các ví</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                Ví: {w.name} ({w.currency})
              </option>
            ))}
          </select>

          {/* Lọc theo Loại */}
          <select
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white focus:border-blue-500 cursor-pointer"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">📊 Tất cả loại giao dịch</option>
            <option value="EXPENSE">➖ Khoản chi</option>
            <option value="INCOME">➕ Khoản thu</option>
            <option value="TRANSFER">⇄ Chuyển khoản</option>
          </select>

          {/* Lọc theo Danh mục */}
          <select
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white focus:border-blue-500 cursor-pointer"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="ALL">🗂️ Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {renderIcon(cat.icon)} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {isFiltering && (
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-gray-100 text-xs sm:text-sm">
            <span className="text-gray-500">
              Tìm thấy <strong className="text-blue-600">{filteredTransactions.length}</strong> / {transactions.length} giao dịch
            </span>
            <button
              onClick={resetFilters}
              className="text-red-500 hover:underline font-medium"
            >
              ✕ Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
      
      {/* --- PHẦN DANH SÁCH GIAO DỊCH --- */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm sm:text-base">
            {isFiltering
              ? 'Không tìm thấy giao dịch nào khớp với bộ lọc hiện tại.'
              : `Bạn chưa có giao dịch nào trong Tháng ${selectedMonth}/${selectedYear}.`}
          </div>
        ) : (
          <>
            {/* GIAO DIỆN THẺ TRÊN ĐIỆN THOẠI (Mobile Card View) */}
            <div className="divide-y divide-gray-100 md:hidden">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${tx.category_color || '#3b82f6'}18` }}
                    >
                      {tx.type === 'TRANSFER' ? '⇄' : renderIcon(tx.category_icon)}
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
                    <div className={`font-bold text-sm sm:text-base whitespace-nowrap ${
                      tx.type === 'EXPENSE' ? 'text-red-500' : tx.type === 'INCOME' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {renderTransactionAmount(tx)}
                    </div>
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
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-gray-50 transition">
                      <td className="p-4 text-gray-700 whitespace-nowrap">
                        {new Date(tx.transaction_date).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{tx.type === 'TRANSFER' ? '⇄' : renderIcon(tx.category_icon)}</span>
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
                        {renderTransactionAmount(tx)}
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
                    setManualToAmount(false);
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
                      <option key={cat.id} value={cat.id}>{renderIcon(cat.icon)} {cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Từ ví</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                  value={formData.wallet_id}
                  onChange={(e) => {
                    const nextWalletId = e.target.value;
                    const nextToWalletId =
                      String(formData.to_wallet_id) === String(nextWalletId)
                        ? (wallets.find(w => String(w.id) !== String(nextWalletId))?.id || '')
                        : formData.to_wallet_id;
                    setManualToAmount(false);
                    setFormData({...formData, wallet_id: nextWalletId, to_wallet_id: nextToWalletId});
                  }}
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
                    onChange={(e) => {
                      setManualToAmount(false);
                      setFormData({...formData, to_wallet_id: e.target.value});
                    }}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.type === 'TRANSFER' ? `Số tiền chuyển đi (${selectedCurrency})` : `Số tiền (${selectedCurrency})`}
                </label>
                <input 
                  type="number" 
                  step="any"
                  required min="1"
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>

              {/* Ô QUY ĐỔI NGOẠI TỆ TỰ ĐỘNG KHI CHUYỂN GIỮA 2 VÍ KHÁC TIỀN TỆ (VD: TWD -> VND) */}
              {isCrossCurrencyTransfer && (
                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-blue-900">
                      Số tiền thực nhận ({targetCurrency})
                    </label>
                    {exchangeRateHint && (
                      <span className="text-xs text-blue-600 font-medium bg-white px-2 py-0.5 rounded-md border border-blue-100">
                        {exchangeRateHint}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    className="w-full border border-blue-300 bg-white rounded-lg p-2.5 outline-none font-semibold text-blue-900 focus:ring-2 focus:ring-blue-500"
                    value={formData.to_amount}
                    onChange={(e) => {
                      setManualToAmount(true);
                      setFormData({ ...formData, to_amount: e.target.value });
                    }}
                  />
                  <div className="flex items-center justify-between text-xs text-blue-700">
                    <span>
                      {formData.to_amount
                        ? `Ví nhận sẽ cộng: ${formatMoney(formData.to_amount, targetCurrency)}`
                        : 'Tự động tính theo tỷ giá thực tế'}
                    </span>
                    {manualToAmount && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualToAmount(false);
                          setFormData(prev => ({
                            ...prev,
                            to_amount: computeConvertedAmount(prev.amount, selectedCurrency, targetCurrency)
                          }));
                        }}
                        className="text-blue-600 underline font-medium"
                      >
                        Lấy lại tỷ giá tự động
                      </button>
                    )}
                  </div>
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
