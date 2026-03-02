import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Eye, EyeOff, Info, Sparkles, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';

const CATEGORIES = [
  { value: 'academic', label: '📚 Academic Issues', desc: 'Exams, marks, attendance, library' },
  { value: 'hostel', label: '🏠 Hostel & Infrastructure', desc: 'Room, facilities, maintenance' },
  { value: 'faculty', label: '👨‍🏫 Faculty Conduct', desc: 'Behavior, bias, misconduct' },
  { value: 'ragging', label: '⚠️ Ragging / Harassment', desc: 'Urgent - handled immediately' },
  { value: 'financial', label: '💰 Financial Issues', desc: 'Fees, scholarships, receipts' },
  { value: 'mental_health', label: '💙 Mental Health & Welfare', desc: 'Stress, counseling needed' },
  { value: 'administrative', label: '🏛️ Administrative Issues', desc: 'Documents, processes' },
  { value: 'general', label: '💬 General Feedback', desc: 'Suggestions and other issues' },
];

const SLA_MAP = { academic: 48, hostel: 24, faculty: 24, ragging: 4, financial: 48, mental_health: 12, administrative: 48, general: 96 };

export default function SubmitGrievancePage() {
  const [form, setForm] = useState({ title: '', description: '', category: '', is_anonymous: false });
  const [aiPreview, setAiPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const analyzeLocally = (text) => {
    if (text.length < 20) return;
    const lower = text.toLowerCase();
    const neg = ['bad', 'terrible', 'urgent', 'broken', 'unacceptable', 'serious'].filter(w => lower.includes(w)).length;
    const sev = Math.min(10, 4 + neg);
    const sentiment = neg > 1 ? 'negative' : 'neutral';
    setAiPreview({ severity: sev, sentiment, estimated_priority: sev >= 7 ? 'high' : sev >= 5 ? 'medium' : 'low' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) { setError('Please select a category'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await api.post('/grievances', form);
      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  if (success) return (
    <div className="max-w-lg mx-auto">
      <div className="card p-8 text-center animate-slide-up">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="text-3xl">✅</div>
        </div>
        <h2 className="font-display text-xl font-bold text-white mb-2">Grievance Submitted!</h2>
        <p className="text-slate-400 text-sm mb-6">Your complaint has been received and will be addressed within the SLA period.</p>
        <div className="bg-slate-800 rounded-xl p-4 mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm"><span className="text-slate-400">Ticket ID</span><span className="font-mono font-bold text-primary-400">{success.data?.ticketId}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-400">Priority</span><span className="font-medium text-amber-400 capitalize">{success.data?.priority}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-400">Category</span><span className="text-slate-300 capitalize">{success.data?.category}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-400">SLA</span><span className="text-slate-300">{success.data?.slaHours} hours</span></div>
        </div>
        {success.trackingToken && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 text-left">
            <div className="text-xs font-medium text-amber-400 mb-1">Anonymous Tracking Token</div>
            <div className="font-mono text-xs text-amber-300 break-all">{success.trackingToken}</div>
            <div className="text-xs text-slate-500 mt-1">Save this token to track your complaint</div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => navigate('/dashboard/grievances')} className="btn-secondary flex-1">View All Grievances</button>
          <button onClick={() => navigate(`/dashboard/grievances/${success.data?.ticketId}`)} className="btn-primary flex-1">Track This</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Submit a Grievance</h1>
        <p className="text-slate-400 text-sm mt-1">Your complaint will be AI-analyzed and routed to the right committee</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Anonymous toggle */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {form.is_anonymous ? <EyeOff size={18} className="text-amber-400" /> : <Eye size={18} className="text-slate-400" />}
              <div>
                <div className="text-sm font-medium text-slate-200">Anonymous Submission</div>
                <div className="text-xs text-slate-500">Your identity will be hidden from investigators</div>
              </div>
            </div>
            <button type="button" onClick={() => setForm(f => ({ ...f, is_anonymous: !f.is_anonymous }))}
              className={`w-12 h-6 rounded-full transition-colors relative ${form.is_anonymous ? 'bg-amber-500' : 'bg-slate-700'}`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${form.is_anonymous ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="label">Category *</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(c => (
              <button type="button" key={c.value} onClick={() => setForm(f => ({ ...f, category: c.value }))}
                className={`text-left p-3 rounded-xl border transition-all ${form.category === c.value ? 'border-primary-500 bg-primary-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}>
                <div className="text-sm font-medium text-slate-200">{c.label}</div>
                <div className="text-xs text-slate-500">{c.desc}</div>
                {c.value === 'ragging' && <div className="text-xs text-red-400 font-medium mt-0.5">⚡ 4-hour SLA</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="label">Title *</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="input" placeholder="Brief summary of your issue" maxLength={300} required />
        </div>

        {/* Description */}
        <div>
          <label className="label">Detailed Description *</label>
          <textarea value={form.description} onChange={e => { setForm(f => ({ ...f, description: e.target.value })); analyzeLocally(e.target.value); }}
            className="input min-h-32 resize-none" placeholder="Describe the issue in detail. Include dates, locations, people involved, and any evidence." minLength={50} required />
          <div className="text-xs text-slate-600 mt-1">{form.description.length}/5000 characters (minimum 50)</div>
        </div>

        {/* AI Preview */}
        {aiPreview && form.description.length > 30 && (
          <div className="card p-4 border-primary-500/30 bg-primary-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} className="text-primary-400" />
              <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">AI Analysis Preview</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className="text-lg font-bold text-white">{aiPreview.severity}/10</div><div className="text-xs text-slate-400">Severity</div></div>
              <div><div className={`text-sm font-bold capitalize ${aiPreview.sentiment === 'negative' ? 'text-red-400' : 'text-slate-300'}`}>{aiPreview.sentiment}</div><div className="text-xs text-slate-400">Sentiment</div></div>
              <div><div className={`text-sm font-bold capitalize ${aiPreview.estimated_priority === 'high' ? 'text-red-400' : aiPreview.estimated_priority === 'medium' ? 'text-amber-400' : 'text-slate-300'}`}>{aiPreview.estimated_priority}</div><div className="text-xs text-slate-400">Priority</div></div>
            </div>
          </div>
        )}

        {/* SLA info */}
        {form.category && (
          <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/50 px-3 py-2 rounded-lg">
            <Info size={14} className="text-primary-400" />
            <span>Expected resolution: <strong className="text-slate-200">{SLA_MAP[form.category]} hours</strong> · Category: <strong className="text-slate-200 capitalize">{form.category.replace('_', ' ')}</strong></span>
          </div>
        )}

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/dashboard/grievances')} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={16} />Submit Grievance</>}
          </button>
        </div>
      </form>
    </div>
  );
}
