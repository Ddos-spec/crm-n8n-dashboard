import { useQuery } from '@tanstack/react-query';
import { Filter, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getCustomers } from '../utils/api.js';

const priorityColors = {
  tinggi: 'bg-danger/20 text-danger',
  sedang: 'bg-warning/20 text-warning',
  rendah: 'bg-success/20 text-success'
};

const CustomerList = () => {
  const [filters, setFilters] = useState({ search: '', priority: '', stage: '' });

  const queryFilters = useMemo(
    () => ({
      search: filters.search || undefined,
      priority: filters.priority || undefined,
      stage: filters.stage || undefined
    }),
    [filters]
  );

  const { data: customers } = useQuery({
    queryKey: ['customers', queryFilters],
    queryFn: () => getCustomers(queryFilters)
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Daftar Pelanggan</h2>
          <p className="text-sm text-slate-400">Kelola percakapan dan informasi pelanggan.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="search"
              placeholder="Cari nama atau nomor"
              className="w-56 rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-3 text-sm text-white focus:border-primary-500 focus:outline-none"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-500" />
            <select
              value={filters.stage}
              onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-primary-500"
            >
              <option value="">Semua Tahap</option>
              <option value="prospect">Prospek</option>
              <option value="negotiation">Negosiasi</option>
              <option value="won">Menang</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-primary-500"
            >
              <option value="">Prioritas</option>
              <option value="tinggi">Tinggi</option>
              <option value="sedang">Sedang</option>
              <option value="rendah">Rendah</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Nomor</th>
              <th className="px-4 py-3">Tahap</th>
              <th className="px-4 py-3">Prioritas</th>
              <th className="px-4 py-3">Terakhir Chat</th>
              <th className="px-4 py-3">Penanggung Jawab</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {customers?.map((customer) => (
              <tr key={customer.id} className="bg-slate-950/60 hover:bg-slate-900/80">
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{customer.name}</div>
                  <div className="text-xs text-slate-500">{customer.tags}</div>
                </td>
                <td className="px-4 py-3 text-slate-200">{customer.phone}</td>
                <td className="px-4 py-3 capitalize text-slate-200">{customer.conversationStage || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityColors[customer.priorityLevel] || 'bg-slate-800 text-slate-200'}`}>
                    {customer.priorityLevel || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {customer.lastMessageAt ? new Date(customer.lastMessageAt).toLocaleString('id-ID') : '-'}
                </td>
                <td className="px-4 py-3 text-slate-200">{customer.assignedTo || '-'}</td>
              </tr>
            ))}
            {!customers?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Tidak ada pelanggan ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerList;
