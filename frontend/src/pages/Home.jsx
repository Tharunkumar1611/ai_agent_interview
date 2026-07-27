import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
      <section className="flex items-center justify-center px-6 py-12 lg:px-10">
        <div className="max-w-xl">
          <span className="inline-flex rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-violet-200">
            AI Placement Mentor
          </span>
          <h1 className="section-title mt-6 text-5xl font-bold leading-tight text-white sm:text-6xl">
            Prepare for interviews with structured practice and guided feedback.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Build your profile, practice DSA and aptitude assessments, and review your progress from one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/login" className="frost-button">
              Sign in
            </Link>
            <Link to="/register" className="frost-button border border-white/10 bg-white/5 text-white hover:bg-white/10">
              Create account
            </Link>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 lg:px-10">
        <div className="glass-panel w-full max-w-md rounded-[2rem] p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">What you get</p>
          <div className="mt-6 space-y-4 text-sm text-slate-200">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Role-focused resume and interview prep</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Timed DSA and aptitude assessments</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Progress insights and weak-area tracking</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Dashboard summary for recent activity</div>
          </div>
        </div>
      </section>
    </div>
  );
}