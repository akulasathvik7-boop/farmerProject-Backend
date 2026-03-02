import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, User, Sparkles, Star, Send } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { StatusBadge } from '../admin/AdminDashboard';

const SENTIMENT_COLORS = { negative: 'text-red-400', neutral: 'text-slate-400', positive: 'text-emerald-400' };

export default function GrievanceDetailPage() {
  const { id } = useParams();
  const [grievance, setGrievance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => { fetchGrievance(); }, [id]);

  const fetchGrievance = async () => {
    try {
      const res = await api.get(`/grievances/${id}`);
      setGrievance(res.data.data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setUpdating(true);
    try {
      await api.put(`/grievances/${grievance.id}/status`, { status: newStatus, note, resolution_note: resolutionNote });
      await fetchGrievance();
      setNewStatus(''); setNote(''); setResolutionNote('');
    } catch (err) { console.error(err); }
    setUpdating(false);
  };

  const handleFeedback = async () => {
    if (!feedbackRating) return;
    try {
      await api.post(`/grievances/${grievance.id}/feedback`, { rating: feedbackRating, comment: feedbackComment });
      await fetchGrievance();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>;
  if (!grievance) return <div className="text-slate-400 text-center py-12">Grievance not found</div>;

  const canUpdate = ['super_admin', 'dept_admin', 'grc_member'].includes(user?.role);
  const canFeedback = user?.role === 'student' && grievance.status === 'resolved' && !grievance.feedback;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
        <ArrowLeft size={16} /> Back to Grievances
      </button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{grievance.ticket_id}</span>
              <StatusBadge status={grievance.status} />
              <span className={`badge bg-slate-800 text-xs font-medium capitalize ${grievance.priority === 'critical' ? 'text-red-400' : grievance.priority === 'high' ? 'text-amber-400' : 'text-slate-400'}`}>
                {grievance.priority}
              </span>
            </div>
            <h1 className="font-display text-xl font-bold text-white mb-3">{grievance.title}</h1>
            <p className="text-slate-300 text-sm leading-relaxed">{grievance.description}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div><div className="text-xs text-slate-500">Category</div><div className="text-sm font-medium text-slate-200 capitalize mt-0.5">{grievance.category?.replace('_', ' ')}</div></div>
          <div><div className="text-xs text-slate-500">Severity</div><div className="text-sm font-bold text-white mt-0.5">{grievance.severity}/10</div></div>
          <div><div className="text-xs text-slate-500">Sentiment</div><div className={`text-sm font-medium mt-0.5 capitalize ${SENTIMENT_COLORS[grievance.sentiment]}`}>{grievance.sentiment}</div></div>
          <div><div className="text-xs text-slate-500">Submitted</div><div className="text-sm font-medium text-slate-200 mt-0.5">{new Date(grievance.created_at).toLocaleDateString()}</div></div>
        </div>

        {/* AI Insights */}
        <div className="mt-4 bg-primary-500/5 border border-primary-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-primary-400" />
            <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">AI Analysis</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-slate-400">Category: <span className="text-slate-200 capitalize">{grievance.ai_category || grievance.category}</span></span>
            <span className="text-slate-400">Confidence: <span className="text-slate-200">{Math.round((grievance.ai_confidence || 0) * 100)}%</span></span>
            <span className="text-slate-400">Sentiment Score: <span className="text-slate-200">{grievance.sentiment_score?.toFixed(2)}</span></span>
          </div>
        </div>

        {grievance.sla_deadline && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Clock size={12} />
            SLA Deadline: {new Date(grievance.sla_deadline).toLocaleString()}
            {new Date() > new Date(grievance.sla_deadline) && grievance.status !== 'resolved' && grievance.status !== 'closed' && (
              <span className="text-red-400 font-medium">⚠ OVERDUE</span>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="card p-6">
        <div className="section-title mb-4">Activity Timeline</div>
        <div className="space-y-4">
          {grievance.timeline?.map((event, i) => (
            <div key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xs">
                  {i === grievance.timeline.length - 1 ? '🔔' : '✓'}
                </div>
                {i < grievance.timeline.length - 1 && <div className="w-0.5 h-full bg-slate-800 mt-1" />}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-200 capitalize">{event.to_status?.replace('_', ' ')}</span>
                  {event.from_status && <span className="text-xs text-slate-600">← {event.from_status?.replace('_', ' ')}</span>}
                </div>
                {event.note && <div className="text-sm text-slate-400">{event.note}</div>}
                <div className="text-xs text-slate-600 mt-1">{new Date(event.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        {grievance.resolution_note && (
          <div className="mt-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
            <div className="text-xs font-medium text-emerald-400 mb-1">Resolution</div>
            <div className="text-sm text-slate-300">{grievance.resolution_note}</div>
          </div>
        )}
      </div>

      {/* Feedback (student on resolved) */}
      {canFeedback && (
        <div className="card p-6">
          <div className="section-title mb-4">Rate the Resolution</div>
          <div className="flex gap-2 mb-4">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setFeedbackRating(n)}
                className={`w-10 h-10 rounded-xl transition-colors ${n <= feedbackRating ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                <Star size={18} className="mx-auto" />
              </button>
            ))}
          </div>
          <textarea value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)}
            className="input mb-3" placeholder="Optional comment about the resolution..." rows={3} />
          <button onClick={handleFeedback} disabled={!feedbackRating} className="btn-primary flex items-center gap-2">
            <Send size={16} />Submit Feedback
          </button>
        </div>
      )}

      {/* Existing feedback */}
      {grievance.feedback && (
        <div className="card p-6">
          <div className="section-title mb-3">Resolution Feedback</div>
          <div className="flex gap-1 mb-2">{[1,2,3,4,5].map(n => <Star key={n} size={16} className={n <= grievance.feedback.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />)}</div>
          {grievance.feedback.comment && <div className="text-sm text-slate-400">{grievance.feedback.comment}</div>}
        </div>
      )}

      {/* Admin status update */}
      {canUpdate && !['closed', 'rejected'].includes(grievance.status) && (
        <div className="card p-6">
          <div className="section-title mb-4">Update Status</div>
          <div className="space-y-3">
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input">
              <option value="">Select new status...</option>
              {['under_review', 'escalated', 'pending_info', 'resolved', 'rejected'].filter(s => s !== grievance.status).map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
            {newStatus === 'resolved' && (
              <textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} className="input" placeholder="Describe how the issue was resolved..." rows={3} required />
            )}
            <textarea value={note} onChange={e => setNote(e.target.value)} className="input" placeholder="Internal note (visible in timeline)..." rows={2} />
            <button onClick={handleStatusUpdate} disabled={!newStatus || updating} className="btn-primary flex items-center gap-2">
              {updating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Update Status'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
