import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, ClipboardList, MessageSquareWarning, TrendingUp, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../lib/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function StatCard({ icon: Icon, label, value, sub, color = 'primary', trend }) {
  const colors = { primary: 'text-primary-400 bg-primary-500/10', emerald: 'text-emerald-400 bg-emerald-500/10', amber: 'text-amber-400 bg-amber-500/10', red: 'text-red-400 bg-red-500/10', violet: 'text-violet-400 bg-violet-500/10' };
  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${colors[color]}`}><Icon size={20} className={colors[color].split(' ')[0]} /></div>
        {trend !== undefined && <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>{trend >= 0 ? '+' : ''}{trend}%</span>}
      </div>
      <div>
        <div className="text-2xl font-display font-bold text-white">{value}</div>
        <div className="text-sm font-medium text-slate-300">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></div>)}
    </div>
  );
  return null;
};

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [grievanceData, setGrievanceData] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/grievances'),
      api.get('/analytics/fees'),
      api.get('/announcements'),
    ]).then(([ov, gv, fees, ann]) => {
      setOverview(ov.data.data);
      setGrievanceData(gv.data.data);
      setFeeData(fees.data.data);
      setAnnouncements(ann.data.data?.slice(0, 5) || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );

  const grievancePieData = grievanceData?.byCategory?.map(c => ({ name: c.category, value: parseInt(c.count) })) || [];
  const grievanceStatusData = grievanceData?.byStatus?.map(s => ({ name: s.status, value: parseInt(s.count) })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Institution summary · Academic Year 2024–25</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/students" className="btn-secondary text-xs">Manage Students</Link>
          <Link to="/dashboard/analytics" className="btn-primary text-xs">Full Analytics</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active Students" value={overview?.total_students || 0} sub={`${overview?.total_faculty || 0} faculty`} color="primary" trend={8} />
        <StatCard icon={ClipboardList} label="Avg Attendance" value={`${overview?.avg_attendance || 0}%`} sub="Across all courses" color="emerald" />
        <StatCard icon={MessageSquareWarning} label="Open Grievances" value={overview?.open_grievances || 0} sub={`${overview?.resolution_rate || 0}% resolved`} color={overview?.open_grievances > 5 ? 'red' : 'amber'} />
        <StatCard icon={DollarSign} label="Fee Collected" value={`₹${((overview?.fee_collected || 0) / 100000).toFixed(1)}L`} sub={`${overview?.pending_fees || 0} pending`} color="violet" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Grievances */}
        <div className="card p-5 lg:col-span-2">
          <div className="section-title mb-4">Grievance Trend (6 months)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={grievanceData?.monthly || []}>
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grievance by Category */}
        <div className="card p-5">
          <div className="section-title mb-4">By Category</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={grievancePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {grievancePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {grievancePieData.slice(0, 4).map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-slate-400 capitalize">{d.name}</span></div>
                <span className="font-medium text-slate-300">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Grievances */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title">Recent Grievances</div>
            <Link to="/dashboard/grievances" className="text-xs text-primary-400 hover:text-primary-300">View all →</Link>
          </div>
          <div className="space-y-2">
            {grievanceData?.recent?.slice(0, 5).map(g => (
              <Link key={g.ticket_id} to={`/dashboard/grievances/${g.ticket_id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${g.priority === 'critical' ? 'bg-red-500' : g.priority === 'high' ? 'bg-amber-500' : 'bg-primary-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">{g.title}</div>
                  <div className="text-xs text-slate-500">{g.ticket_id} · {g.category}</div>
                </div>
                <StatusBadge status={g.status} />
              </Link>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title">Recent Announcements</div>
            <Link to="/dashboard/announcements" className="text-xs text-primary-400 hover:text-primary-300">View all →</Link>
          </div>
          <div className="space-y-3">
            {announcements.map(ann => (
              <div key={ann.id} className="flex gap-3">
                <div className={`w-1.5 rounded-full shrink-0 ${ann.priority === 'urgent' ? 'bg-red-500' : ann.priority === 'important' ? 'bg-amber-500' : 'bg-slate-600'}`} />
                <div>
                  <div className="text-sm font-medium text-slate-200">{ann.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{ann.content}</div>
                  <div className="text-xs text-slate-600 mt-1">{new Date(ann.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    under_review: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    escalated: 'bg-red-500/10 text-red-400 border border-red-500/30',
    resolved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    closed: 'bg-slate-700 text-slate-400',
    rejected: 'bg-slate-800 text-slate-500',
    pending_info: 'bg-violet-500/10 text-violet-400 border border-violet-500/30',
  };
  return <span className={`badge text-[10px] ${map[status] || 'bg-slate-700 text-slate-400'}`}>{status?.replace('_', ' ')}</span>;
}
