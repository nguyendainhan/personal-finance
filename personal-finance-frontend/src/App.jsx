import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Import Layout và các trang
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Wallets from './pages/Wallets';
import Budgets from './pages/Budgets';
import Plans from './pages/Plans';
import Auth from './pages/Auth'; 
import Categories from './pages/Categories';

// === TỰ ĐỘNG GẮN TOKEN VÀ XỬ LÝ KHI TOKEN HẾT HẠN ===
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

axios.interceptors.request.use((config) => {
  const currentToken = localStorage.getItem('token');
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Component Vệ sĩ ở Frontend (Kiểm tra xem đã đăng nhập chưa)
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token');
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />; // Đá văng ra trang login
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route không cần bảo vệ */}
        <Route path="/login" element={<Auth />} />

        {/* CÁC ROUTE ĐƯỢC BẢO VỆ (Phải đăng nhập mới thấy) */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="wallets" element={<Wallets />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="plans" element={<Plans />} />
          <Route path="categories" element={<Categories />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
