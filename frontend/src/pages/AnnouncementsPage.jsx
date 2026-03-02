import React, { useEffect, useState } from 'react';
import { Bell, Plus, X } from 'lucide-react';
import api from './lib/api';
import { useAuthStore } from './store/authStore';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', target_role: 'all', priority: 'general' });
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();
  const canCreate = ['super_admin', 'dept_admin', 'faculty'].includes(user?.role);

  useEffect(() => {
    api.get('/announcements').then(r => setAnnouncements(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/announcements', form);
      setShowForm(false);
      setForm({ title: '', content: '', target_role: 'all', priority: 'general' });
      const r = await api.get('/announcements');
      setAnnouncements(r.data.data || []);
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const PRIORITY_STYLES = { urgent: 'bg-red-500/10 border-red-500/20', important: 'bg-amber-500/10 border-amber-500/20', general: 'bg-slate-800 border-slate-700' };
  const PRIORITY_DOT = { urgent: 'bg-red-500', important: 'bg-amber-500', general: 'bg-slate-500' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold text-white">Announcements</h1><p className="text-slate-400 text-sm mt-1">{announcements.length} active announcements</p></div>
        {canCreate && <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus size={16} />New Announcement</button>}
      </div>

      {showForm && (
        <div className="card p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4"><div className="section-title">Create Announcement</div><button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={18} /></button></div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div><label className="label">Title *</label><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
            <div><label className="label">Content *</label><textarea className="input" rows={4} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Target Audience</label>
                <select className="input" value={form.target_role} onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))}>
                  <option value="all">Everyone</option><option value="student">Students only</option><option value="faculty">Faculty only</option>
                </select>
              </div>
              <div><label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="general">General</option><option value="important">Important</option><option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Publish'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div> :
        <div className="space-y-3">
          {announcements.map(ann => (
            <div key={ann.id} className={`card p-5 border ${PRIORITY_STYLES[ann.priority]}`}>
              <div className="flex items-start gap-4">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[ann.priority]}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-slate-100">{ann.title}</h3>
                    <span className={`badge text-xs capitalize ${ann.priority === 'urgent' ? 'text-red-400 bg-red-500/10' : ann.priority === 'important' ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 bg-slate-700'}`}>{ann.priority}</span>
                    <span className="badge text-xs text-slate-500 bg-slate-800 capitalize">{ann.target_role}</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{ann.content}</p>
                  <div className="text-xs text-slate-600 mt-2">{new Date(ann.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
