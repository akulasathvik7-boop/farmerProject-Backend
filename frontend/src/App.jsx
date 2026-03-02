import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentsPage from './pages/admin/StudentsPage';
import GrievancesPage from './pages/grievances/GrievancesPage';
import SubmitGrievancePage from './pages/grievances/SubmitGrievancePage';
import GrievanceDetailPage from './pages/grievances/GrievanceDetailPage';
import AttendancePage from './pages/attendance/AttendancePage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import StudentDashboard from './pages/student/StudentDashboard';
import TimetablePage from './pages/TimetablePage';
import AnnouncementsPage from './pages/AnnouncementsPage';

function ProtectedRoute({ children }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ children, roles }) {
  const { user } = useAuthStore();
  if (!user) return null;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { fetchMe, token } = useAuthStore();

  useEffect(() => {
    if (token) fetchMe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<SmartHome />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="grievances" element={<GrievancesPage />} />
          <Route path="grievances/submit" element={<SubmitGrievancePage />} />
          <Route path="grievances/:id" element={<GrievanceDetailPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="student" element={<StudentDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function SmartHome() {
  const { user } = useAuthStore();
  if (!user) return null;
  if (user.role === 'student') return <Navigate to="/dashboard/student" replace />;
  if (user.role === 'grc_member') return <Navigate to="/dashboard/grievances" replace />;
  return <Navigate to="/dashboard/admin" replace />;
}
