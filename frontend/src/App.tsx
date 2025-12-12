import Sidebar from './components/Common/Sidebar';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import BusinessList from './components/Businesses/BusinessList';
import CustomerList from './components/Customers/CustomerList';

// Pages (Placeholders)
const Chat = () => <div className="p-8"><h1 className="text-2xl font-bold">Chat</h1></div>;
const Escalations = () => <div className="p-8"><h1 className="text-2xl font-bold">Escalations</h1></div>;
const Knowledge = () => <div className="p-8"><h1 className="text-2xl font-bold">Knowledge Base</h1></div>;
const Analytics = () => <div className="p-8"><h1 className="text-2xl font-bold">Analytics</h1></div>;
const Settings = () => <div className="p-8"><h1 className="text-2xl font-bold">Settings</h1></div>;
const Login = () => <div className="flex h-screen items-center justify-center">Login Page</div>;

function App() {
  // Check auth (simplified)
  const isAuthenticated = true; // Replace with actual auth check

  if (!isAuthenticated) return <Login />;

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <div className="ml-64 flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/businesses" element={<BusinessList />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/escalations" element={<Escalations />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
