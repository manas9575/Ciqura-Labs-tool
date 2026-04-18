import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import AuthCallback from './components/AuthCallback';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Batches from './pages/Batches';
import BatchDetail from './pages/BatchDetail';
import Students from './pages/Students';
import StudentProfile from './pages/StudentProfile';
import Attendance from './pages/Attendance';
import Assignments from './pages/Assignments';
import Fees from './pages/Fees';
import FilesPage from './pages/Files';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import Holidays from './pages/Holidays';
import Leaves from './pages/Leaves';
import AdminNotifications from "./pages/AdminNotifications";
import AllUsers from "./pages/AllUsers";


// 🔐 Protected Route
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}


// 🔁 Redirect logged-in users away from login page
function PublicRoute({ children }) {
  const { user } = useAuth();

  if (user) return <Navigate to="/dashboard" replace />;

  return children;
}


// 🔄 Smart fallback (handles unknown routes)
function NotFoundRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}


// 🚦 Main Router
function AppRouter() {
  const location = useLocation();

  // Handle OAuth/session callback
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>

      {/* Public route */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>

        {/* Default route */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:courseId" element={<CourseDetail />} />
        <Route path="batches" element={<Batches />} />
        <Route path="batches/:batchId" element={<BatchDetail />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:userId" element={<StudentProfile />} />
        <Route path="faculty" element={<Students isFaculty />} />
        <Route path="faculty/:userId" element={<StudentProfile />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="fees" element={<Fees />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="holidays" element={<Holidays />} />
        <Route path="leaves" element={<Leaves />} />
        <Route path="admin/notifications" element={<AdminNotifications />} />
        <Route path="users" element={<AllUsers />} />
      </Route>

      {/* Catch-all route */}
      <Route path="*" element={<NotFoundRedirect />} />

    </Routes>
  );
}


// 🌐 App Wrapper
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
