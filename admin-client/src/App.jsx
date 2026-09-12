import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './pages/Layout';
import Questions from './pages/Questions';
import Exams from './pages/Exams';
import Results from './pages/Results';
import Violations from './pages/Violations';

function isAuthed() { return !!localStorage.getItem('admin_token'); }
function Private({ children }) { return isAuthed() ? children : <Navigate to="/login" replace />; }

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Private><Layout /></Private>}>
        <Route path="/questions" element={<Questions />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/exams/:examId/results" element={<Results />} />
        <Route path="/violations" element={<Violations />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthed() ? '/questions' : '/login'} replace />} />
    </Routes>
  );
}
