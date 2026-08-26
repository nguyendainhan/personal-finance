import { Link, Outlet } from 'react-router-dom';

const Layout = () => {
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar bên trái */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="h-16 flex items-center justify-center border-b">
          <h1 className="text-2xl font-bold text-blue-600">IceStore Finance</h1>
        </div>
        
        {/* Menu điều hướng */}
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="block px-4 py-2 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition">
            📊 Tổng quan
          </Link>
          <Link to="/transactions" className="block px-4 py-2 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition">
            💳 Giao dịch
          </Link>
          <Link to="/wallets" className="block px-4 py-2 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition">
            🏦 Ví tiền
          </Link>
          <Link to="/budgets" className="block px-4 py-2 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition">
            📈 Ngân sách
          </Link>
          <Link to="/plans" className="block px-4 py-2 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition">
            💡 Kế hoạch
          </Link>
          <Link to="/categories" className="block px-4 py-2 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition">
            🗂️ Danh mục
          </Link>
        </nav>

        {/* Nút Đăng xuất ở cuối Sidebar */}
        <div className="p-4 border-t">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 rounded-lg hover:bg-red-50 transition font-medium"
          >
            🚪 Đăng xuất
          </button>
        </div>
      </aside>

      {/* Cột nội dung chính bên phải */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-end px-6">
          <div className="flex items-center gap-3">
            {/* Hiển thị tên thật của người đăng nhập */}
            <span className="text-sm font-medium text-gray-700">Xin chào, {username}</span>
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              {firstLetter}
            </div>
          </div>
        </header>

        {/* Khu vực hiển thị các trang con */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default Layout;