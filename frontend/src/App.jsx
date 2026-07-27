import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Dashboard from './pages/DashboardPro';
import AptitudeAssessment from './pages/AptitudeAssessment';
import DSAAssessment from './pages/DSAAssessment';
import MockInterview from './pages/MockInterview';
import Login from './pages/Login';
import MyResumes from './pages/MyResumes';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';
import Register from './pages/Register';
import ResumeDetail from './pages/ResumeDetailPro';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/aptitude-assessment" element={<AptitudeAssessment />} />
        <Route path="/dsa-assessment" element={<DSAAssessment />} />
        <Route path="/mock-interview" element={<MockInterview />} />
        <Route path="/resumes" element={<MyResumes />} />
        <Route path="/resumes/:id" element={<ResumeDetail />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
