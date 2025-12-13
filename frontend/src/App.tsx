import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CustomerService from './pages/CustomerService';
import Marketing from './pages/Marketing';
import { CustomerContextProvider } from './context/customer';
import { api, Escalation } from './lib/api';
import { useCustomerContext } from './context/customer';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/customer-service', label: 'Customer Service' },
  { to: '/marketing', label: 'Marketing' },
];

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showBell, setShowBell] = useState(false);
  const [escData, setEscData] = useState<Escalation[]>([]);
  const hasEscalation = escData.length > 0;
  const { setFocusName } = useCustomerContext();

  useEffect(() => {
    const loadEsc = async () => {
      try {
        const { data } = await api.getEscalations();
        setEscData(data);
      } catch (err) {
        console.error('Failed fetch escalations', err);
      }
    };
    void loadEsc();
  }, []);

  return (
    <div className="page">
      <nav className="nav">
        <div className="brand">
          <span className="brand-dot" />
          Customer Service Tepat Laser
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
          <button
            className={hasEscalation ? 'icon-button danger' : 'icon-button'}
            type="button"
              onClick={() => setShowBell((p) => !p)}
              aria-label="Lihat eskalasi"
            >
              🔔
              {hasEscalation ? <span className="badge">{escalations.length}</span> : null}
            </button>
          </div>
          {showBell ? (
            <div className="bell-panel">
              <div className="bell-header">
                <span>Eskalasi perlu respon</span>
                <button className="icon-button" type="button" onClick={() => setShowBell(false)}>
                  ✕
                </button>
              </div>
            {escData.map((e) => (
              <div
                key={e.name}
                className="bell-row"
                onClick={() => {
                  setShowBell(false);
                  setFocusName(e.name ?? null);
                  navigate('/customer-service');
                }}
              >
                <div>
                  <div className="status-title">{e.name}</div>
                  <div className="muted truncate">{e.issue}</div>
                </div>
                <span className={e.priority === 'high' ? 'pill danger' : 'pill warning'}>
                  {e.priority === 'high' ? 'eskalasi' : 'pending'}
                </span>
              </div>
            ))}
            <button
              className="button"
              type="button"
              onClick={() => {
                setShowBell(false);
                navigate('/customer-service');
              }}
            >
              Buka Customer Service
            </button>
          </div>
        ) : null}
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
      <CustomerContextProvider>
        <Layout />
      </CustomerContextProvider>
    </BrowserRouter>
  );
}
