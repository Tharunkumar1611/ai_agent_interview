import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center text-white">
      <div className="glass-panel max-w-lg rounded-[2rem] border-white/10 bg-white/[0.05] p-10">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">404</p>
        <h1 className="section-title mt-3 text-4xl font-bold">Page not found</h1>
        <p className="mt-4 text-slate-300">The route you requested does not exist.</p>
        <Link to="/dashboard" className="frost-button mt-6 inline-flex">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
