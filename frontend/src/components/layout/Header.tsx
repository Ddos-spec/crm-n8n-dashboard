import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useCustomerContext } from '../../context/customer';
import { api, Notification } from '../../lib/api';
import {
  LayoutDashboard,
  MessageSquare,
  Target,
  CheckSquare,
  Sun,
  Moon,
  Bell,
  MessageCircle,
  AlertTriangle,
  UserPlus,
  Calculator
} from 'lucide-react';

// Helper to format time ago
const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  return `${diffDays} hari yang lalu`;
};

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { setFocusName } = useCustomerContext();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when dropdown opens
  useEffect(() => {
    fetchNotifications();
    // Refresh every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Handle notification click
  const handleNotificationClick = useCallback((notif: Notification) => {
    setIsNotifOpen(false);

    if (notif.type === 'escalation' || notif.type === 'chat') {
      // Navigate to customer service
      navigate('/customer-service');
      // If we have customer info, we could set focus
    } else if (notif.type === 'lead') {
      // Navigate to marketing
      navigate('/marketing');
    }
  }, [navigate]);

  // Mark all as read (for now just clears local state since we don't have backend support)
  const handleMarkAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'escalation':
        return (
          <div className="notification-icon escalation">
            <AlertTriangle size={18} />
          </div>
        );
      case 'chat':
        return (
          <div className="notification-icon chat">
            <MessageCircle size={18} />
          </div>
        );
      case 'lead':
        return (
          <div className="notification-icon lead">
            <UserPlus size={18} />
          </div>
        );
    }
  };

  return (
    <>
      <header className="header">
        <div className="logo">
          <img src="/logo.ico" alt="Logo" style={{ width: 45, height: 45, objectFit: 'contain' }} />
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
          <NavLink
            to="/tugas"
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            <CheckSquare size={16} />
            Tugas
          </NavLink>
          <NavLink
            to="/ai"
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            <Calculator size={16} />
            Estimator
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
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                if (!isNotifOpen) fetchNotifications();
              }}
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {/* Notification Dropdown */}
            <div className={`notification-dropdown ${isNotifOpen ? 'active' : ''}`}>
              <div className="notification-header">
                <h3>Notifikasi</h3>
                <button className="mark-read" onClick={handleMarkAllRead}>Tandai semua dibaca</button>
              </div>
              <div className="notification-list">
                {loading && notifications.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Memuat...
                  </div>
                )}

                {!loading && notifications.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Tidak ada notifikasi
                  </div>
                )}

                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`notification-item ${!notif.read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                    style={{ cursor: 'pointer' }}
                  >
                    {getNotificationIcon(notif.type)}
                    <div className="notification-content">
                      <p><strong>{notif.title}</strong> {notif.message}</p>
                      <span className="time">{formatTimeAgo(notif.time)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="notification-footer">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsNotifOpen(false);
                    // Could navigate to a notifications page if one exists
                  }}
                >
                  Lihat semua notifikasi
                </a>
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