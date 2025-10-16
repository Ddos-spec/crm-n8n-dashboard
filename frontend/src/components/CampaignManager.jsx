import { useQuery } from '@tanstack/react-query';
import { Pause, Play, Plus } from 'lucide-react';
import { getCampaigns } from '../utils/api.js';

const statusBadge = (status) => {
  switch (status) {
    case 'running':
      return 'bg-success/20 text-success';
    case 'paused':
      return 'bg-warning/20 text-warning';
    default:
      return 'bg-slate-800 text-slate-200';
  }
};

const CampaignManager = () => {
  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaigns
  });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Manajemen Kampanye</h2>
          <p className="text-xs text-slate-400">Kontrol penuh kampanye pemasaran otomatis.</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500">
          <Plus size={18} /> Kampanye Baru
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {campaigns?.map((campaign) => (
          <div key={campaign.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold text-white">{campaign.name}</h3>
                <p className="text-xs text-slate-400">{campaign.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadge(campaign.status)}`}>
                  {campaign.status}
                </span>
                <button className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">
                  {campaign.status === 'running' ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
            </div>
          </div>
        ))}
        {!campaigns?.length && <p className="text-sm text-slate-400">Belum ada kampanye terdaftar.</p>}
      </div>
    </div>
  );
};

export default CampaignManager;
