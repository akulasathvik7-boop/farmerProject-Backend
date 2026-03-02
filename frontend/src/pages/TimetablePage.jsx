// TimetablePage.jsx
import React, { useEffect, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import api from './lib/api';
import { useAuthStore } from './store/authStore';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat' };
const COLORS = ['bg-primary-500/10 border-primary-500/20 text-primary-300', 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300', 'bg-amber-500/10 border-amber-500/20 text-amber-300', 'bg-violet-500/10 border-violet-500/20 text-violet-300', 'bg-sky-500/10 border-sky-500/20 text-sky-300'];

export default function TimetablePage() {
  const [timetable, setTimetable] = useState({});
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [semester, setSemester] = useState('3');
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    api.get('/programs').then(r => { setPrograms(r.data.data || []); if (r.data.data?.length) setSelectedProgram(r.data.data[0].id); });
  }, []);

  useEffect(() => {
    if (!selectedProgram) return;
    setLoading(true);
    api.get('/timetable', { params: { program_id: selectedProgram, semester } })
      .then(r => setTimetable(r.data.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedProgram, semester]);

  const courseColorMap = {};
  let colorIdx = 0;
  Object.values(timetable).flat().forEach(slot => {
    if (!courseColorMap[slot.course_id]) courseColorMap[slot.course_id] = COLORS[colorIdx++ % COLORS.length];
  });

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-white">Timetable</h1><p className="text-slate-400 text-sm mt-1">Weekly class schedule</p></div>

      <div className="flex flex-wrap gap-3">
        <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} className="input w-auto">
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={semester} onChange={e => setSemester(e.target.value)} className="input w-auto">
          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {DAYS.map(day => (
            <div key={day} className="card p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{DAY_LABELS[day]}</div>
              <div className="space-y-2">
                {(timetable[day] || []).length === 0 ? (
                  <div className="text-xs text-slate-600 py-4 text-center">No classes</div>
                ) : (
                  (timetable[day] || []).map(slot => (
                    <div key={slot.id} className={`p-2.5 rounded-lg border text-xs ${courseColorMap[slot.course_id] || COLORS[0]}`}>
                      <div className="font-semibold">{slot.course_code}</div>
                      <div className="opacity-75 truncate">{slot.course_name}</div>
                      <div className="flex items-center gap-1 mt-1 opacity-60"><Clock size={9} />{slot.start_time?.slice(0,5)}–{slot.end_time?.slice(0,5)}</div>
                      {slot.room && <div className="mt-0.5 opacity-60">📍 {slot.room}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
