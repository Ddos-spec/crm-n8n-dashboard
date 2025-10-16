import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Phone } from 'lucide-react';
import { getBusinesses } from '../utils/api.js';

const statusColor = {
  baru: 'bg-primary-600/20 text-primary-300',
  kontak: 'bg-warning/20 text-warning',
  closing: 'bg-success/20 text-success'
};

const BusinessLeads = () => {
  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => getBusinesses({ limit: 10 })
  });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Prospek Google Maps</h2>
        <span className="text-xs text-slate-400">Top 10 terbaru</span>
      </div>
      <div className="mt-4 space-y-3">
        {businesses?.map((business) => (
          <div key={business.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{business.name}</p>
                <p className="text-xs text-slate-400">{business.marketSegment}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColor[business.status] || 'bg-slate-800 text-slate-200'}`}>
                {business.status || 'baru'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><MapPin size={14} /> {business.address}</span>
              {business.phone && (
                <span className="flex items-center gap-1"><Phone size={14} /> {business.phone}</span>
              )}
              {business.leadScore && (
                <span className="flex items-center gap-1"><Building2 size={14} /> Skor {business.leadScore}</span>
              )}
            </div>
          </div>
        ))}
        {!businesses?.length && <p className="text-sm text-slate-400">Belum ada prospek.</p>}
      </div>
    </div>
  );
};

export default BusinessLeads;
