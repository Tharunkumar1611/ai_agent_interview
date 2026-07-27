import { Link } from 'react-router-dom';
import ResumeCard from './ResumeCard';

export default function Sidebar({ recentResumes = [], role }) {
  const stats = [
    { label: 'Authenticated', value: 'JWT' },
    { label: 'Storage', value: 'MongoDB Atlas' },
    { label: 'Hashing', value: 'BCrypt' },
    { label: 'Input', value: 'PDF (optional)' },
  ];

  return (
    <aside className="space-y-5">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{stat.label}</p>
              <p className="mt-3 text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Recent uploads</p>
            <h2 className="section-title mt-2 text-2xl font-bold text-white">Latest uploads</h2>
          </div>
          <Link to="/resumes" className="secondary-button text-sm">
            See all
          </Link>
        </div>

        <div className="mt-6 grid gap-4">
          {recentResumes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-400">
              No uploads yet. Upload a PDF to see extracted details here.
            </div>
          ) : (
            recentResumes.map((resume) => <ResumeCard key={resume.id} resume={resume} compact />)
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-slate-900/50 p-6">
        <p className="text-sm uppercase tracking-[0.28em] text-violet-200">Current role</p>
        <h3 className="section-title mt-2 text-2xl font-bold text-white">{role}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          This role is saved for the session and sent with every upload so your profile library stays organized by target job title.
        </p>
      </div>
    </aside>
  );
}
