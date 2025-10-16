import { useQuery } from '@tanstack/react-query';
import { Activity, PhoneCall, Rocket, Users } from 'lucide-react';
import { getDashboardOverview, getCampaigns, getPendingFollowUps } from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useEffect } from 'react';

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-slate-950/40">
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-primary-600/20 p-3 text-primary-300">
        <Icon size={26} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-2xl font-semibold">{value ?? '-'}</p>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { socket } = useSocket();

  const { data: overview, refetch: refetchOverview } = useQuery({
    queryKey: ['overview'],
    queryFn: getDashboardOverview
  });

  const { data: campaigns, refetch: refetchCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaigns
  });

  const { data: followUps, refetch: refetchFollowUps } = useQuery({
    queryKey: ['followUps'],
    queryFn: getPendingFollowUps
  });

  useEffect(() => {
    if (!socket) return;

    const handlers = {
      new_message: refetchOverview,
      new_lead: refetchCampaigns,
      campaign_created: refetchCampaigns,
      pending_followups: refetchFollowUps,
      notification: refetchOverview
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [socket, refetchOverview, refetchCampaigns, refetchFollowUps]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-white">Ringkasan Operasional</h1>
        <p className="text-sm text-slate-400">Pantau performa layanan dan pemasaran secara real-time.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total Percakapan" value={overview?.summary?.totalConversations ?? 0} />
        <StatCard icon={PhoneCall} label="Rata-rata Respon" value={`${overview?.summary?.avgResponseTime ?? '-'} mnt`} />
        <StatCard icon={Activity} label="Skor Kepuasan" value={overview?.summary?.satisfactionScore ?? '-'} />
        <StatCard icon={Rocket} label="Tingkat Resolusi" value={`${overview?.summary?.resolutionRate ?? '-'}%`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Kampanye Aktif</h2>
              <span className="text-xs text-slate-400">{campaigns?.length ?? 0} kampanye</span>
            </div>
            <div className="mt-4 space-y-3">
              {campaigns?.map((campaign) => (
                <div key={campaign.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{campaign.name}</p>
                      <p className="text-xs text-slate-400">{campaign.description}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        campaign.status === 'running'
                          ? 'bg-success/20 text-success'
                          : campaign.status === 'paused'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                </div>
              ))}
              {!campaigns?.length && <p className="text-sm text-slate-400">Belum ada kampanye.</p>}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold">Notifikasi Terbaru</h2>
            <div className="mt-4 space-y-3">
              {overview?.notifications?.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.message}</p>
                </div>
              ))}
              {!overview?.notifications?.length && <p className="text-sm text-slate-400">Tidak ada notifikasi.</p>}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tindak Lanjut Mendatang</h2>
            <span className="text-xs text-slate-400">{followUps?.length ?? 0} jadwal</span>
          </div>
          <div className="mt-4 space-y-3">
            {followUps?.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="font-semibold text-white">{item.customerName || item.businessName}</p>
                <p className="text-xs text-slate-400">{new Date(item.scheduledAt).toLocaleString('id-ID')}</p>
                <p className="text-xs text-slate-500">{item.notes}</p>
              </div>
            ))}
            {!followUps?.length && <p className="text-sm text-slate-400">Belum ada tindak lanjut.</p>}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
