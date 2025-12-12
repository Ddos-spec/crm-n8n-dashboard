import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Button } from '../Common/Button';

interface Customer {
  id: number;
  name: string | null;
  phone: string;
  status: string;
  conversation_stage: string;
  is_cooldown_active: boolean;
}

const CustomerList = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading customers...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <Button>Add Customer</Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name/Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cooldown</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {customers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-500">No customers found.</td></tr>
            ) : (
                customers.map((customer) => (
                <tr key={customer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {customer.name || 'Unknown'}<br/>
                        <span className="text-slate-500 font-normal">{customer.phone}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                            {customer.status}
                        </span>
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {customer.conversation_stage}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {customer.is_cooldown_active ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Active</span>
                        ) : (
                             <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Ready</span>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <button className="text-indigo-600 hover:text-indigo-900">Chat</button>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerList;
