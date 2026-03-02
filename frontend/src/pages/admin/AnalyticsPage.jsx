// AnalyticsPage.jsx
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../lib/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];
const CT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs">
    <div className="text-slate-400 mb-1">{label}</div>
    {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name || 'Value'}: <span className="font-bold">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span></div>)}
  </div>
) : null;

export default function AnalyticsPage() {
  const [gData, setGData] = useState(null);
  const [attData, setAttData] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/analytics/grievances'), api.get('/analytics/attendance'), api.get('/analytics/fees')])
      .then(([g, a, f]) => { setGData(g.data.data); setAttData(a.data.data); setFeeData(f.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>;

  const categoryData = gData?.byCategory?.map(c => ({ name: c.category, count: parseInt(c.count), severity: parseFloat(c.avg_severity || 0).toFixed(1) })) || [];
  const statusData = gData?.byStatus?.map(s => ({ name: s.status?.replace('_', ' '), value: parseInt(s.count) })) || [];
  const sentimentData = gData?.bySentiment?.map(s => ({ name: s.sentiment, value: parseInt(s.count) })) || [];
  const monthlyFees = feeData?.monthly?.map(m => ({ month: m.month?.slice(5), amount: Math.round(parseFloat(m.amount) / 1000) })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Analytics Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Institution-wide insights and trends</p>
      </div>

      {/* Grievance Analytics */}
      <div>
        <h2 className="text-base font-semibold text-slate-300 mb-4">Grievance Intelligence</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="card p-4 text-center">
            <div className="text-3xl font-display font-bold text-white">{gData?.recent?.length || 0}</div>
            <div className="text-sm text-slate-400">Recent Complaints</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-display font-bold text-emerald-400">{gData?.avg_resolution_hours || 0}h</div>
            <div className="text-sm text-slate-400">Avg Resolution Time</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-display font-bold text-primary-400">{sentimentData.find(s => s.name === 'negative')?.value || 0}</div>
            <div className="text-sm text-slate-400">Negative Sentiment</div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="section-title mb-4">Complaints by Category</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CT />} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-5">
            <div className="section-title mb-4">Status Distribution</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={2}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip content={<CT />} /></PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {statusData.map((d, i) => <div key={d.name} className="flex items-center gap-1.5 text-xs"><div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-slate-400 truncate capitalize">{d.name}</span><span className="ml-auto font-medium text-slate-300">{d.value}</span></div>)}
            </div>
          </div>
        </div>
        <div className="card p-5 mt-4">
          <div className="section-title mb-4">Monthly Trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={gData?.monthly || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} name="Complaints" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance */}
      <div>
        <h2 className="text-base font-semibold text-slate-300 mb-4">Attendance Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="section-title mb-4">Course Attendance %</div>
            <div className="space-y-3">
              {attData?.courseStats?.map(c => (
                <div key={c.course_code}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-400 truncate">{c.course}</span><span className={parseFloat(c.avg_attendance) < 75 ? 'text-red-400' : 'text-emerald-400'}>{c.avg_attendance}%</span></div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${c.avg_attendance}%`, background: parseFloat(c.avg_attendance) < 75 ? '#ef4444' : '#10b981' }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <div className="section-title mb-4">Students Below 75% Attendance</div>
            <div className="divide-y divide-slate-800">
              {attData?.below75?.length === 0 ? <div className="text-slate-500 text-sm py-4 text-center">No students below 75%</div> :
                attData?.below75?.map(s => (
                  <div key={s.student_id} className="py-2.5 flex items-center justify-between">
                    <div><div className="text-sm font-medium text-slate-200">{s.full_name}</div><div className="text-xs text-slate-500">{s.student_id}</div></div>
                    <span className="font-bold text-red-400">{s.pct}%</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fee Analytics */}
      <div>
        <h2 className="text-base font-semibold text-slate-300 mb-4">Fee Collection</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-display font-bold text-white">₹{((feeData?.total_collected || 0) / 100000).toFixed(1)}L</div>
            <div className="text-sm text-slate-400">Total Collected</div>
          </div>
          <div className="card p-4 lg:col-span-2">
            <div className="section-title mb-3">Monthly Collection (₹K)</div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={monthlyFees}><XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip content={<CT />} /><Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} name="₹K" /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
