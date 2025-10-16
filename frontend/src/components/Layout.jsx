import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const navItems = [
  { href: '/', label: 'Beranda' },
  { href: '/pelanggan', label: 'Pelanggan' }
];

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden rounded-md border border-slate-700 p-2"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/" className="text-lg font-semibold text-primary-400">
              CRM Terpadu
            </Link>
          </div>
          <nav className="hidden gap-4 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-600 text-white' : 'text-slate-200 hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden flex-col text-right text-xs lg:flex">
              <span className="font-semibold">{user?.fullName}</span>
              <span className="text-slate-400 capitalize">{user?.role}</span>
            </div>
            <button
              onClick={logout}
              className="rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white transition hover:bg-danger/80"
            >
              Keluar
            </button>
          </div>
        </div>
        {isOpen && (
          <div className="border-t border-slate-800 bg-slate-900 lg:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 text-sm ${isActive ? 'bg-primary-600 text-white' : 'text-slate-200'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 lg:py-8">{children}</main>
    </div>
  );
};

export default Layout;
