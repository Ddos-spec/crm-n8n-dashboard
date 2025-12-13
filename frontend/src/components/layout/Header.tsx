import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Target, 
  Sun, 
  Moon, 
  Bell,
  Check,
  MessageCircle,
  AlertTriangle,
  UserPlus
} from 'lucide-react';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <>
      <header className="header">
        <div className="logo">
          <div className="logo-icon">TL</div>
          <div className="logo-text">Tepat<span>Laser</span> CRM</div>
        </div>

        <nav className="nav-tabs">
          <NavLink 
            to="/" 
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
          <NavLink 
            to="/customer-service" 
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            <MessageSquare size={16} />
            Customer Service
          </NavLink>
          <NavLink 
            to="/marketing" 
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            <Target size={16} />
            Marketing
          </NavLink>
        </nav>

        <div className="header-right">
          <div className="status-badge">
            <span className="status-dot"></span>
            Online
          </div>

          <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            title="Toggle Dark/Light Mode"
          >
            {theme === 'dark' ? <Moon size={20} className="icon-moon" /> : <Sun size={20} className="icon-sun" />}
          </button>

          <div className="notification-wrapper">
            <button 
              className="notification-btn" 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
            >
              <Bell size={20} />
              <span className="badge">3</span>
            </button>

            {/* Notification Dropdown */}
            <div className={`notification-dropdown ${isNotifOpen ? 'active' : ''}`}>
              <div className="notification-header">
                <h3>Notifikasi</h3>
                <button className="mark-read">Tandai semua dibaca</button>
              </div>
              <div className="notification-list">
                {/* Dummy Notifications matching HTML */}
                <div className="notification-item unread">
                  <div className="notification-icon escalation">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="notification-content">
                    <p><strong>Escalation baru</strong> dari Ceuna mengenai pricing membutuhkan perhatian segera</p>
                    <span className="time">5 menit yang lalu</span>
                  </div>
                </div>
                <div className="notification-item unread">
                  <div className="notification-icon chat">
                    <MessageCircle size={18} />
                  </div>
                  <div className="notification-content">
                    <p><strong>Pesan baru</strong> dari Ian Tachy: "Apakah bisa cutting bahan stainless?"</p>
                    <span className="time">12 menit yang lalu</span>
                  </div>
                </div>
                <div className="notification-item unread">
                  <div className="notification-icon lead">
                    <UserPlus size={18} />
                  </div>
                  <div className="notification-content">
                    <p><strong>Lead baru</strong> PT Metalindo Pratama dengan score 92 ditambahkan</p>
                    <span className="time">1 jam yang lalu</span>
                  </div>
                </div>
              </div>
              <div className="notification-footer">
                <a href="#">Lihat semua notifikasi</a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Overlay to close dropdown */}
      {isNotifOpen && (
        <div 
          className="dropdown-overlay active" 
          onClick={() => setIsNotifOpen(false)} 
        />
      )}
    </>
  );
}
