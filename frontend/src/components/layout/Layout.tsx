import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Header } from './Header';
import {
  LayoutDashboard,
  MessageSquare,
  Target,
  CheckSquare,
  Sparkles
} from 'lucide-react';

export function Layout() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-inner">
          <NavLink
            to="/"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            end
          >
            <LayoutDashboard size={20} className="mobile-nav-icon" />
            <span>Home</span>
          </NavLink>
          <NavLink
            to="/customer-service"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <MessageSquare size={20} className="mobile-nav-icon" />
            <span>Chat</span>
          </NavLink>
          <NavLink
            to="/marketing"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Target size={20} className="mobile-nav-icon" />
            <span>Leads</span>
          </NavLink>
          <NavLink
            to="/tugas"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <CheckSquare size={20} className="mobile-nav-icon" />
            <span>Tugas</span>
          </NavLink>
          <NavLink
            to="/ai"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Sparkles size={20} className="mobile-nav-icon" />
            <span>AI</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
}
