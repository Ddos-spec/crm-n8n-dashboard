import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CustomerService from './pages/CustomerService';
import Marketing from './pages/Marketing';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/customer-service', label: 'Customer Service' },
  { to: '/marketing', label: 'Marketing' },
];

function Layout() {
  const location = useLocation();

  return (
    <div className="page">
      <nav className="nav">
        <div className="brand">
          <span className="brand-dot" />
          CRM x n8n
        </div>
        <div className="nav-links">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={location.pathname === link.to ? 'nav-link active' : 'nav-link'}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customer-service" element={<CustomerService />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
