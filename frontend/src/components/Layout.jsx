import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinkClass = ({ isActive }) =>
  [
    'rounded-full px-4 py-2 text-sm font-medium transition',
    isActive ? 'bg-violet-500/18 text-white shadow-[0_0_0_1px_rgba(168,85,247,0.25)]' : 'text-slate-300 hover:bg-white/8 hover:text-white',
  ].join(' ');

export default function Layout() {
  const { user, logout, selectedRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 text-lg font-black text-white shadow-lg shadow-violet-500/20">
              R
            </div>
            <div>
              <p className="section-title text-lg font-bold tracking-tight">AI Placement Mentor</p>
              <p className="text-xs text-slate-400">Mock Interview Coach & premium preparation dashboard</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/aptitude-assessment" className={navLinkClass}>
              Aptitude Assessment
            </NavLink>
            <NavLink to="/mock-interview" className={navLinkClass}>
              Mock Interview
            </NavLink>
            <NavLink to="/dsa-assessment" className={navLinkClass}>
              DSA Assessment
            </NavLink>
            <NavLink to="/resumes" className={navLinkClass}>
              My Resumes
            </NavLink>
            <NavLink to="/profile" className={navLinkClass}>
              Profile
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-slate-400">{selectedRole}</p>
            </div>
            <button type="button" onClick={handleLogout} className="secondary-button text-sm">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
