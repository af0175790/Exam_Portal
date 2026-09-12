import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ExamList from './pages/ExamList';
import ExamRoom from './pages/ExamRoom';

function isAuthed() {
  return !!localStorage.getItem('candidate_token');
}

function Private({ children }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/exams" element={<Private><ExamList /></Private>} />
      <Route path="/exam-room/:examId" element={<Private><ExamRoom /></Private>} />
      <Route path="*" element={<Navigate to={isAuthed() ? '/exams' : '/login'} replace />} />
    </Routes>
  );
}
