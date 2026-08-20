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

const Wallets = () => {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/wallets');
        if (response.data.success) {
          setWallets(response.data.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu ví:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWallets();
  }, []);

  if (loading) return <div className="text-center mt-10 text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Quản lý ví tiền</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.map((wallet) => (
          <div key={wallet.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-700">{wallet.name}</h3>
              <span className="text-2xl">{wallet.icon || '💳'}</span>
            </div>
            <div className="text-gray-500 text-sm mb-1">Số dư hiện tại</div>
            <div className="text-2xl font-bold text-blue-600">
              {/* Sử dụng hàm format tiền Đài ở đây */}
              {formatMoney(wallet.balance)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wallets;