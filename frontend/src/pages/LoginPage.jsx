import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { GraduationCap, Eye, EyeOff, LogIn, BookOpen, Users, BarChart3, Shield } from 'lucide-react';

const DEMO_USERS = [
  { label: 'Super Admin', email: 'admin@college.edu', pass: 'admin123', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30' },
  { label: 'Faculty', email: 'rajesh@college.edu', pass: 'faculty123', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  { label: 'Student', email: 'arjun.singh@student.college.edu', pass: 'student123', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { label: 'GRC Member', email: 'grc@college.edu', pass: 'grc123', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) navigate('/dashboard');
  };

  const fillDemo = (u) => { setEmail(u.email); setPassword(u.pass); };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-slate-900 via-primary-950/50 to-slate-950 p-12 border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <GraduationCap size={22} className="text-white" />
          </div>
          <span className="font-display text-xl font-bold text-white">EduSphere</span>
        </div>

        <div>
          <h1 className="font-display text-5xl font-bold text-white leading-tight mb-6">
            Modern College<br />
            <span className="text-primary-400">Management</span><br />
            Platform
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-10">
            Streamline administration, empower students, and resolve grievances intelligently with AI-powered insights.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Users, label: 'Student Management', desc: 'Complete lifecycle management' },
              { icon: BarChart3, label: 'Live Analytics', desc: 'Real-time dashboards' },
              { icon: BookOpen, label: 'Course Management', desc: 'Attendance & results' },
              { icon: Shield, label: 'AI Grievances', desc: 'Smart complaint routing' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <Icon size={20} className="text-primary-400 mb-2" />
                <div className="text-sm font-semibold text-slate-200">{label}</div>
                <div className="text-xs text-slate-500">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-slate-600">© 2024 EduSphere. All rights reserved.</div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="font-display text-xl font-bold">EduSphere</span>
          </div>

          <h2 className="font-display text-3xl font-bold mb-2">Welcome back</h2>
          <p className="text-slate-400 mb-8">Sign in to your account to continue</p>

          {/* Demo Accounts */}
          <div className="mb-6">
            <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-medium">Quick demo access</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map(u => (
                <button key={u.label} onClick={() => fillDemo(u)} className={`border rounded-lg px-3 py-2 text-left transition-all hover:scale-[1.02] ${u.bg}`}>
                  <div className={`text-xs font-semibold ${u.color}`}>{u.label}</div>
                  <div className="text-xs text-slate-500 truncate">{u.email}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="you@college.edu" required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><LogIn size={16} />Sign in</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
