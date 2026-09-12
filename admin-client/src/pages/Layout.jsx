import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { setToken, setUser, getUser } from '../api';

export default function Layout() {
  const nav = useNavigate();
  const user = getUser();

  function logout() {
    setToken(null);
    setUser(null);
    nav('/login');
  }

  return (
    <div className="shell">
      <div className="sidebar">
        <div className="brand">Exam <span>Admin</span></div>
        <NavLink to="/questions" className={({ isActive }) => (isActive ? 'active' : '')}>Questions</NavLink>
        <NavLink to="/exams" className={({ isActive }) => (isActive ? 'active' : '')}>Exams</NavLink>
        <NavLink to="/violations" className={({ isActive }) => (isActive ? 'active' : '')}>Violations</NavLink>
        <div className="logout">
          <div style={{ fontSize: 12.5, color: '#9aa096', marginBottom: 8 }}>{user?.name}</div>
          <button className="btn btn-outline btn-sm" onClick={logout} style={{ color: '#fff', borderColor: '#3a4048' }}>
            Log out
          </button>
        </div>
      </div>
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
