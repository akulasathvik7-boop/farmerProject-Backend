import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareWarning, Plus, Search, Filter, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { StatusBadge } from '../admin/AdminDashboard';

const PRIORITY_COLORS = { low: 'text-slate-400', medium: 'text-amber-400', high: 'text-orange-400', critical: 'text-red-400' };
const CATEGORY_ICONS = { academic: '📚', hostel: '🏠', faculty: '👨‍🏫', ragging: '⚠️', financial: '💰', mental_health: '💙', administrative: '🏛️', general: '💬' };

export default function GrievancesPage() {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    fetchGrievances();
  }, [statusFilter, categoryFilter]);

  const fetchGrievances = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const res = await api.get('/grievances', { params });
      setGrievances(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const filtered = grievances.filter(g =>
    search === '' || g.title.toLowerCase().includes(search.toLowerCase()) || g.ticket_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Grievances</h1>
          <p className="text-slate-400 text-sm mt-1">{user?.role === 'student' ? 'Track your submitted complaints' : 'Manage and resolve student complaints'}</p>
        </div>
        {user?.role === 'student' && (
          <Link to="/dashboard/grievances/submit" className="btn-primary flex items-center gap-2">
            <Plus size={16} />Submit Grievance
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" placeholder="Search by title or ticket ID..." />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto text-sm">
            <option value="">All Status</option>
            {['submitted', 'under_review', 'escalated', 'pending_info', 'resolved', 'closed', 'rejected'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input w-auto text-sm">
            <option value="">All Categories</option>
            {['academic', 'hostel', 'faculty', 'ragging', 'financial', 'mental_health', 'administrative', 'general'].map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquareWarning size={40} className="text-slate-600 mx-auto mb-3" />
          <div className="text-slate-400">No grievances found</div>
          {user?.role === 'student' && <Link to="/dashboard/grievances/submit" className="btn-primary inline-flex items-center gap-2 mt-4 text-sm"><Plus size={14} />Submit your first grievance</Link>}
        </div>
      ) : (
        <div className="card divide-y divide-slate-800">
          {filtered.map(g => (
            <Link key={g.id} to={`/dashboard/grievances/${g.ticket_id}`} className="flex items-center gap-4 p-4 hover:bg-slate-800/30 transition-colors">
              <div className="text-xl shrink-0">{CATEGORY_ICONS[g.category] || '💬'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-500">{g.ticket_id}</span>
                  <StatusBadge status={g.status} />
                  <span className={`text-xs font-medium ${PRIORITY_COLORS[g.priority]}`}>● {g.priority}</span>
                </div>
                <div className="text-sm font-medium text-slate-200">{g.is_anonymous && !['super_admin','dept_admin','grc_member'].includes(user?.role) ? g.title : g.title}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500 capitalize">{g.category?.replace('_', ' ')}</span>
                  <span className="text-xs text-slate-600">Severity: {g.severity}/10</span>
                  <span className="flex items-center gap-1 text-xs text-slate-600"><Clock size={10} />{new Date(g.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {g.severity >= 8 && <AlertTriangle size={16} className="text-red-400 shrink-0" />}
              <ChevronRight size={16} className="text-slate-600 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
