// StudentDashboard.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareWarning, TrendingUp, DollarSign, Bell, Clock } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { StatusBadge } from '../admin/AdminDashboard';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [attendance, setAttendance] = useState(null);
  const [fees, setFees] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [results, setResults] = useState([]);
  const profile = user?.profile;

  useEffect(() => {
    if (!profile?.id) return;
    Promise.all([
      api.get(`/students/${profile.id}/attendance`),
      api.get(`/students/${profile.id}/fees`),
      api.get('/grievances'),
      api.get('/announcements'),
      api.get(`/students/${profile.id}/results`),
    ]).then(([att, fee, gv, ann, res]) => {
      setAttendance(att.data.data);
      setFees(fee.data.data);
      setGrievances(gv.data.data?.slice(0, 3) || []);
      setAnnouncements(ann.data.data?.slice(0, 4) || []);
      setResults(res.data.data?.slice(0, 4) || []);
    }).catch(console.error);
  }, [profile]);

  const attendanceColor = (pct) => pct >= 75 ? '#10b981' : pct >= 65 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'} 👋</h1>
          <p className="text-slate-400 text-sm mt-1">{profile?.student_id} · {profile?.program_name} · Semester {profile?.current_semester}</p>
        </div>
        <Link to="/dashboard/grievances/submit" className="btn-primary flex items-center gap-2 text-sm">
          <MessageSquareWarning size={15} />Submit Grievance
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-2xl font-display font-bold text-white">{attendance?.overall || 0}%</div>
          <div className="text-sm text-slate-400">Overall Attendance</div>
          <div className={`text-xs mt-1 ${attendance?.overall >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>
            {attendance?.overall >= 75 ? '✓ Good standing' : '⚠ Below 75%'}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-display font-bold text-white">{results.length}</div>
          <div className="text-sm text-slate-400">Exam Results</div>
          <div className="text-xs mt-1 text-slate-500">This semester</div>
        </div>
        <div className="stat-card">
          <div className={`text-2xl font-display font-bold ${fees?.balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            ₹{((fees?.balance || 0) / 1000).toFixed(0)}K
          </div>
          <div className="text-sm text-slate-400">Fee Balance</div>
          <div className="text-xs mt-1 text-slate-500">{fees?.balance > 0 ? 'Pending payment' : 'Fully paid'}</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-display font-bold text-white">{grievances.length}</div>
          <div className="text-sm text-slate-400">Grievances</div>
          <div className="text-xs mt-1 text-slate-500">Active complaints</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance by Subject */}
        <div className="card p-5">
          <div className="section-title mb-4">Attendance by Subject</div>
          <div className="space-y-3">
            {attendance?.subjects?.map(s => (
              <div key={s.course_code}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-300 truncate">{s.course_name}</span>
                  <span className="font-medium" style={{ color: attendanceColor(s.percentage) }}>{s.percentage}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${s.percentage}%`, background: attendanceColor(s.percentage) }} />
                </div>
                {s.percentage < 75 && <div className="text-xs text-red-400 mt-1">⚠ {s.attended}/{s.total_sessions} sessions attended</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Results */}
        <div className="card p-5">
          <div className="section-title mb-4">Recent Results</div>
          {results.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-6">No results published yet</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {results.map(r => (
                <div key={r.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-200">{r.course_name}</div>
                    <div className="text-xs text-slate-500">{r.exam_name} · {r.marks_obtained}/{r.max_marks}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{r.grade}</div>
                    <div className="text-xs text-slate-500">{r.grade_points} GP</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Grievances */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title">My Grievances</div>
            <Link to="/dashboard/grievances" className="text-xs text-primary-400 hover:text-primary-300">View all →</Link>
          </div>
          {grievances.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-slate-500 text-sm mb-3">No active grievances</div>
              <Link to="/dashboard/grievances/submit" className="btn-primary text-sm">Submit Grievance</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {grievances.map(g => (
                <Link key={g.id} to={`/dashboard/grievances/${g.ticket_id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">{g.title}</div>
                    <div className="text-xs text-slate-500">{g.ticket_id}</div>
                  </div>
                  <StatusBadge status={g.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="card p-5">
          <div className="section-title mb-4">Announcements</div>
          <div className="space-y-3">
            {announcements.map(ann => (
              <div key={ann.id} className="flex gap-3">
                <div className={`w-1 rounded-full shrink-0 ${ann.priority === 'urgent' ? 'bg-red-500' : ann.priority === 'important' ? 'bg-amber-500' : 'bg-slate-600'}`} />
                <div>
                  <div className="text-sm font-medium text-slate-200">{ann.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{ann.content}</div>
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-1"><Clock size={10} />{new Date(ann.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
