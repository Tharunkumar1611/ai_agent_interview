import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
      await register(form.name, form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
      <section className="flex items-center justify-center px-6 py-12 lg:px-10 order-2 lg:order-1">
        <div className="glass-panel w-full max-w-md rounded-[2rem] p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Get started</p>
          <h2 className="section-title mt-2 text-3xl font-bold text-white">Create account</h2>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="frost-input"
                placeholder="Your name"
                required
              />
            </div>
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
                placeholder="Create a strong password"
                required
              />
            </div>

            {error && <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

            <button type="submit" disabled={loading} className="frost-button w-full">
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-violet-200 hover:text-violet-100">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      <section className="order-1 flex items-center justify-center px-6 py-12 lg:order-2 lg:px-10">
        <div className="max-w-xl">
          <span className="inline-flex rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-violet-200">
            AI Placement Mentor
          </span>
          <h1 className="section-title mt-6 text-5xl font-bold leading-tight text-white sm:text-6xl">
            Start with authentication, then access the AI Placement Mentor dashboard.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Your account uses BCrypt password hashing, JWT session storage, and protected routes for a secure experience.
          </p>
        </div>
      </section>
    </div>
  );
}
