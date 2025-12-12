import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Button } from '../Common/Button';

interface Business {
  id: number;
  name: string;
  place_id: string;
  phone: string | null;
  lead_score: number;
  status: string;
}

const BusinessList = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const response = await api.get('/businesses');
      setBusinesses(response.data);
    } catch (error) {
      console.error('Failed to fetch businesses', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading businesses...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Businesses</h1>
        <Button>Add Business</Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lead Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {businesses.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-500">No businesses found.</td></tr>
            ) : (
                businesses.map((business) => (
                <tr key={business.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{business.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{business.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            business.status === 'new' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                            {business.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                         <div className="flex items-center">
                            <span className={`h-2.5 w-2.5 rounded-full mr-2 ${
                                business.lead_score > 70 ? 'bg-green-500' : business.lead_score > 30 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></span>
                            {business.lead_score}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <button className="text-indigo-600 hover:text-indigo-900">View</button>
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

export default BusinessList;
