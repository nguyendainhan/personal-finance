import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Wallets from './pages/Wallets';
import Transactions from './pages/Transactions';
import Dashboard from './pages/Dashboard';
import Budgets from './pages/Budgets';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="wallets" element={<Wallets />} />
          <Route path="budgets" element={<Budgets />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;