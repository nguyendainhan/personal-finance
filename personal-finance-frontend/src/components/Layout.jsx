import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: '📊' },
  { path: '/transactions', label: 'Giao dịch', shortLabel: 'Giao dịch', icon: '💳' },
  { path: '/wallets', label: 'Ví tiền', shortLabel: 'Ví tiền', icon: '🏦' },
  { path: '/budgets', label: 'Ngân sách', shortLabel: 'Ngân sách', icon: '📈' },
  { path: '/plans', label: 'Kế hoạch', shortLabel: 'Kế hoạch', icon: '💡' },
  { path: '/categories', label: 'Danh mục', shortLabel: 'Danh mục', icon: '🗂️' },
];

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // 1. Đọc tên user từ LocalStorage (nếu không có thì để mặc định là 'User')
  const username = localStorage.getItem('username') || 'User';
  
  // 2. Lấy chữ cái đầu tiên làm Avatar (Viết hoa)
  const firstLetter = username.charAt(0).toUpperCase();

  // 3. Hàm xử lý đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login'; // Tải lại trang web và đá ra login
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar bên trái (Hiển thị trên màn hình máy tính / tablet ngang) */}
      <aside className="hidden md:flex w-64 bg-white shadow-lg flex-col shrink-0">
        <div className="h-16 flex items-center justify-center border-b">
          <h1 className="text-2xl font-bold text-blue-600">💎 IceStore Finance</h1>
        </div>
        
        {/* Menu điều hướng */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Nút Đăng xuất ở cuối Sidebar */}
        <div className="p-4 border-t">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 rounded-xl hover:bg-red-50 transition font-medium"
          >
            🚪 Đăng xuất
          </button>
        </div>
      </aside>

      {/* Drawer Menu trên điện thoại (Khi bấm nút ☰) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="h-16 px-4 flex items-center justify-between border-b">
              <h1 className="text-xl font-bold text-blue-600">💎 IceStore Finance</h1>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b bg-blue-50/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {firstLetter}
              </div>
              <div>
                <p className="text-xs text-gray-500">Tài khoản đang dùng</p>
                <p className="font-semibold text-gray-800">{username}</p>
              </div>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition font-medium"
              >
                🚪 Đăng xuất
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Cột nội dung chính bên phải */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <header className="h-14 md:h-16 bg-white shadow-xs border-b border-gray-100 flex items-center justify-between md:justify-end px-4 md:px-6 shrink-0">
          {/* Nút mở menu & Logo trên Mobile */}
          <div className="flex items-center gap-2.5 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200"
              aria-label="Mở menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-bold text-lg text-blue-600">💎 IceStore</span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Hiển thị tên thật của người đăng nhập */}
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              <span className="hidden sm:inline">Xin chào, </span>{username}
            </span>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm md:text-base font-bold">
              {firstLetter}
            </div>
          </div>
        </header>

        {/* Khu vực hiển thị các trang con */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-3.5 sm:p-6 pb-20 md:pb-6">
          <Outlet /> 
        </main>

        {/* Thanh điều hướng dưới đáy (Bottom Navigation) cho Điện thoại */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 px-1 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-1 rounded-lg transition ${
                  active ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span className={`text-lg leading-none mb-1 ${active ? 'scale-110' : ''} transition-transform`}>
                  {item.icon}
                </span>
                <span className="text-[10px] tracking-tight truncate max-w-[56px]">
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Layout;
