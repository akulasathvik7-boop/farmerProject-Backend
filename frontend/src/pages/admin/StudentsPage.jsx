import React, { useEffect, useState } from 'react';
import { Plus, Search, User, GraduationCap, Phone, ChevronRight } from 'lucide-react';
import api from '../../lib/api';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState({ full_name: '', email: '', program_id: '', admission_year: 2024, current_semester: 1, phone: '', guardian_name: '', guardian_phone: '' });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);

  useEffect(() => {
    fetchStudents();
    api.get('/programs').then(r => setPrograms(r.data.data || []));
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      const res = await api.get('/students', { params });
      setStudents(res.data.data || []);
    } catch (e) {} finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/students', form);
      setShowForm(false);
      setForm({ full_name: '', email: '', program_id: '', admission_year: 2024, current_semester: 1, phone: '', guardian_name: '', guardian_phone: '' });
      fetchStudents();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const loadDetail = async (s) => {
    setSelected(s);
    const [att, fees, results] = await Promise.all([
      api.get(`/students/${s.id}/attendance`),
      api.get(`/students/${s.id}/fees`),
      api.get(`/students/${s.id}/results`),
    ]);
    setStudentDetail({ attendance: att.data.data, fees: fees.data.data, results: results.data.data });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Students</h1>
          <p className="text-slate-400 text-sm mt-1">{students.length} students enrolled</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />{showForm ? 'Cancel' : 'Add Student'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card p-6 animate-slide-up">
          <h3 className="section-title mb-4">Enroll New Student</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div><label className="label">Full Name *</label><input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required /></div>
            <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
            <div><label className="label">Program *</label>
              <select className="input" value={form.program_id} onChange={e => setForm(f => ({ ...f, program_id: e.target.value }))} required>
                <option value="">Select Program</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label className="label">Semester</label><input type="number" min={1} max={8} className="input" value={form.current_semester} onChange={e => setForm(f => ({ ...f, current_semester: e.target.value }))} /></div>
            <div><label className="label">Admission Year</label><input type="number" className="input" value={form.admission_year} onChange={e => setForm(f => ({ ...f, admission_year: e.target.value }))} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="label">Guardian Name</label><input className="input" value={form.guardian_name} onChange={e => setForm(f => ({ ...f, guardian_name: e.target.value }))} /></div>
            <div><label className="label">Guardian Phone</label><input className="input" value={form.guardian_phone} onChange={e => setForm(f => ({ ...f, guardian_phone: e.target.value }))} /></div>
            <div className="col-span-2 flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus size={14} />Enroll Student</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search by name or student ID..." />
        </div>
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 card divide-y divide-slate-800">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>
          ) : students.map(s => (
            <div key={s.id} onClick={() => loadDetail(s)} className={`flex items-center gap-4 p-4 cursor-pointer transition-colors hover:bg-slate-800/40 ${selected?.id === s.id ? 'bg-slate-800/60' : ''}`}>
              <div className="w-10 h-10 bg-primary-600/20 rounded-xl flex items-center justify-center text-primary-400 font-bold text-sm shrink-0">
                {s.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-200">{s.full_name}</div>
                <div className="text-xs text-slate-500">{s.student_id} · {s.program_code} · Sem {s.current_semester}</div>
              </div>
              <span className={`badge text-xs ${s.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>{s.status}</span>
              <ChevronRight size={14} className="text-slate-600" />
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        <div>
          {selected && studentDetail ? (
            <div className="space-y-4 animate-slide-up">
              <div className="card p-4">
                <div className="text-center mb-4">
                  <div className="w-14 h-14 bg-primary-600/20 rounded-2xl flex items-center justify-center text-primary-400 font-bold text-xl mx-auto mb-2">{selected.full_name.charAt(0)}</div>
                  <div className="font-medium text-white">{selected.full_name}</div>
                  <div className="text-xs text-slate-500 font-mono">{selected.student_id}</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Program</span><span className="text-slate-300">{selected.program_name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Semester</span><span className="text-slate-300">{selected.current_semester}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="text-slate-300 text-xs">{selected.email}</span></div>
                </div>
              </div>

              <div className="card p-4">
                <div className="text-sm font-medium text-slate-300 mb-3">Attendance Overview</div>
                <div className="text-3xl font-display font-bold text-white mb-1">{studentDetail.attendance?.overall || 0}%</div>
                <div className="space-y-2">
                  {studentDetail.attendance?.subjects?.slice(0, 3).map(s => (
                    <div key={s.course_code}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{s.course_code}</span>
                        <span className={s.percentage < 75 ? 'text-red-400' : 'text-emerald-400'}>{s.percentage}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.percentage < 75 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${s.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-4">
                <div className="text-sm font-medium text-slate-300 mb-3">Fee Status</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Due</span><span className="text-slate-300">₹{(studentDetail.fees?.totalDue || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Paid</span><span className="text-emerald-400">₹{(studentDetail.fees?.totalPaid || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between border-t border-slate-800 pt-2"><span className="text-slate-400 font-medium">Balance</span><span className={`font-bold ${studentDetail.fees?.balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>₹{(studentDetail.fees?.balance || 0).toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-slate-500">
              <User size={32} className="mx-auto mb-3 text-slate-700" />
              <div className="text-sm">Select a student to view details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
