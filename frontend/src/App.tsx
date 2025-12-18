import { Suspense, lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { CustomerContextProvider } from './context/customer';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/layout/Layout';

// Lazy load pages for performance optimization
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CustomerService = lazy(() => import('./pages/CustomerService'));
const Marketing = lazy(() => import('./pages/Marketing'));
const Tugas = lazy(() => import('./pages/Tugas'));
const Penugasan = lazy(() => import('./pages/Penugasan'));

// Simple Loading Spinner for Suspense fallback
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100%', 
    minHeight: '400px',
    color: 'var(--text-muted)' 
  }}>
    Loading...
  </div>
);

export default function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <CustomerContextProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
              } />
              <Route path="/customer-service" element={
                <Suspense fallback={<PageLoader />}>
                  <CustomerService />
                </Suspense>
              } />
              <Route path="/marketing" element={
                <Suspense fallback={<PageLoader />}>
                  <Marketing />
                </Suspense>
              } />
              <Route path="/tugas" element={
                <Suspense fallback={<PageLoader />}>
                  <Tugas />
                </Suspense>
              } />
              <Route path="/tugas/penugasan/:projectId" element={
                <Suspense fallback={<PageLoader />}>
                  <Penugasan />
                </Suspense>
              } />
              <Route path="*" element={
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
              } />
            </Route>
          </Routes>
        </CustomerContextProvider>
      </ThemeProvider>
    </HashRouter>
  );
}