import { Link, Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar bên trái */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="h-16 flex items-center justify-center border-b">
          <h1 className="text-2xl font-bold text-blue-600">IceStore Finance</h1>
        </div>
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
        </nav>
      </aside>

      {/* Cột nội dung chính bên phải */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-end px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Xin chào, Dev User</span>
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              D
            </div>
          </div>
        </header>

        {/* Khu vực hiển thị các trang con (Dashboard, Giao dịch...) */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <Outlet /> {/* Đây là nơi React Router sẽ đổ nội dung vào */}
        </main>
      </div>
    </div>
  );
};

export default Layout;