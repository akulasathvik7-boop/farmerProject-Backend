import React, { useEffect, useState } from 'react';
import { ClipboardList, Plus, Check, X } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [report, setReport] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [marking, setMarking] = useState(false);
  const [sessionCreated, setSessionCreated] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'faculty' && user?.profile) {
      api.get('/courses', { params: { faculty_id: user.profile.id } }).then(r => setCourses(r.data.data || []));
    } else {
      api.get('/courses').then(r => setCourses(r.data.data || []));
    }
    if (user?.role === 'student' && user?.profile) {
      api.get(`/students/${user.profile.id}/attendance`).then(r => setReport(r.data.data));
    }
  }, [user]);

  const loadCourseReport = async (courseId) => {
    setSelectedCourse(courseId);
    if (!courseId) return;
    setLoading(true);
    try {
      const [rep, sess] = await Promise.all([
        api.get(`/attendance/course/${courseId}/report`),
        api.get(`/courses/${courseId}/sessions`),
      ]);
      setReport(rep.data.data);
      setSessions(sess.data.data || []);

      // Get students for marking
      const stds = rep.data.data?.students || [];
      setStudents(stds);
      const initAtt = {};
      stds.forEach(s => { initAtt[s.id] = 'present'; });
      setAttendance(initAtt);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const createSession = async () => {
    if (!selectedCourse) return;
    try {
      const res = await api.post('/attendance/session', {
        course_id: selectedCourse,
        session_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toTimeString().slice(0, 8),
        topic: 'Regular class',
      });
      setSessionCreated(res.data.data);
    } catch (e) { alert('Error creating session'); }
  };

  const submitAttendance = async () => {
    if (!sessionCreated) return;
    setMarking(true);
    const presentIds = Object.entries(attendance).filter(([, v]) => v === 'present').map(([k]) => k);
    const absentIds = Object.entries(attendance).filter(([, v]) => v === 'absent').map(([k]) => k);
    try {
      if (presentIds.length) await api.post('/attendance/mark', { session_id: sessionCreated.sessionId, student_ids: presentIds, status: 'present' });
      if (absentIds.length) await api.post('/attendance/mark', { session_id: sessionCreated.sessionId, student_ids: absentIds, status: 'absent' });
      setSessionCreated(null);
      await loadCourseReport(selectedCourse);
      alert('Attendance marked successfully!');
    } catch (e) { alert('Error marking attendance'); }
    setMarking(false);
  };

  if (user?.role === 'student') return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">My Attendance</h1>
      {report ? (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-3xl font-display font-bold text-white mb-1">{report.overall}%</div>
            <div className="text-slate-400 text-sm">Overall Attendance</div>
            <div className={`text-xs mt-1 ${report.overall >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>{report.overall >= 75 ? '✓ Good standing' : '⚠ Below minimum required 75%'}</div>
          </div>
          <div className="card p-5">
            <div className="section-title mb-4">Subject-wise Breakdown</div>
            <div className="space-y-4">
              {report.subjects?.map(s => (
                <div key={s.course_code}>
                  <div className="flex justify-between mb-1.5">
                    <div><div className="text-sm font-medium text-slate-200">{s.course_name}</div><div className="text-xs text-slate-500">{s.attended || 0}/{s.total_sessions || 0} sessions</div></div>
                    <div className="text-right"><div className={`text-lg font-bold ${s.percentage < 75 ? 'text-red-400' : 'text-emerald-400'}`}>{s.percentage}%</div></div>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.percentage}%`, background: s.percentage < 75 ? '#ef4444' : '#10b981' }} /></div>
                  {s.percentage < 75 && <div className="text-xs text-red-400 mt-1">⚠ Requires attendance condonation</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : <div className="card p-12 text-center text-slate-500">No attendance data available</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold text-white">Attendance</h1><p className="text-slate-400 text-sm mt-1">Mark and track class attendance</p></div>
        {selectedCourse && !sessionCreated && <button onClick={createSession} className="btn-primary flex items-center gap-2"><Plus size={16} />Mark Today's Attendance</button>}
        {sessionCreated && <button onClick={submitAttendance} disabled={marking} className="btn-primary flex items-center gap-2"><Check size={16} />Submit Attendance</button>}
      </div>

      <div>
        <label className="label">Select Course</label>
        <select value={selectedCourse} onChange={e => loadCourseReport(e.target.value)} className="input max-w-sm">
          <option value="">Choose a course...</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
      </div>

      {sessionCreated && (
        <div className="card p-5 border-primary-500/30 bg-primary-500/5 animate-slide-up">
          <div className="flex items-center gap-2 mb-4"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-sm font-medium text-emerald-400">Session Active · QR: {sessionCreated.qrCode}</span></div>
          <div className="space-y-2">
            {students.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50">
                <div><div className="text-sm font-medium text-slate-200">{s.full_name}</div><div className="text-xs text-slate-500">{s.student_id}</div></div>
                <div className="flex gap-2">
                  <button onClick={() => setAttendance(a => ({ ...a, [s.id]: 'present' }))} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${attendance[s.id] === 'present' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}><Check size={12} /></button>
                  <button onClick={() => setAttendance(a => ({ ...a, [s.id]: 'absent' }))} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${attendance[s.id] === 'absent' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}><X size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>}

      {report && !loading && selectedCourse && (
        <div className="card p-5">
          <div className="section-title mb-4">Attendance Report · {sessions.length} Sessions</div>
          <div className="divide-y divide-slate-800">
            {report.students?.map(s => (
              <div key={s.student_id} className="flex items-center gap-4 py-3">
                <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center text-primary-400 text-sm font-bold shrink-0">{s.full_name.charAt(0)}</div>
                <div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-200">{s.full_name}</div><div className="text-xs text-slate-500">{s.student_id} · {s.present || 0}/{s.total_sessions || 0} present</div></div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${s.percentage}%`, background: s.percentage < 75 ? '#ef4444' : '#10b981' }} /></div>
                  <span className={`text-sm font-bold w-12 text-right ${s.percentage < 75 ? 'text-red-400' : 'text-emerald-400'}`}>{s.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
