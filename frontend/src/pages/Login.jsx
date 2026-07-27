import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
      <section className="flex items-center justify-center px-6 py-12 lg:px-10">
        <div className="max-w-xl">
          <span className="inline-flex rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-violet-200">
            AI Placement Mentor
          </span>
          <h1 className="section-title mt-6 text-5xl font-bold leading-tight text-white sm:text-6xl">
            Personalized interview preparation and mock interviews.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Sign in to set your target role, optionally upload a profile PDF, and access tailored mock interview coaching and preparation guidance.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              'JWT-secured workspace',
              'Profile text extraction (optional)',
              'Role-aware preparation plans',
              'Mock interview sessions',
            ].map((item) => (
              <div key={item} className="glass-panel rounded-2xl p-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 lg:px-10">
        <div className="glass-panel w-full max-w-md rounded-[2rem] p-8">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Welcome back</p>
            <h2 className="section-title mt-2 text-3xl font-bold text-white">Login</h2>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="frost-input"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className="frost-input"
                placeholder="Your password"
                required
              />
            </div>

            {error && <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

            <button type="submit" disabled={loading} className="frost-button w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            New here?{' '}
            <Link to="/register" className="font-semibold text-violet-200 hover:text-violet-100">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
