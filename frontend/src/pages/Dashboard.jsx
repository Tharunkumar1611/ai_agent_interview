import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { loadAptitudeDashboard, loadLatestAptitudeInsight } from '../api/aptitude';
import { loadLatestDsaInsight } from '../api/dsa';
import { useAuth } from '../context/AuthContext';
import ResumeCard from '../components/ResumeCard';
import Sidebar from '../components/Sidebar';

const LATEST_DSA_INSIGHT_KEY = 'resume_builder_latest_dsa_insight';
const LATEST_APTITUDE_INSIGHT_KEY = 'resume_builder_latest_aptitude_insight';

const ROLE_OPTIONS = [
  'Software Engineer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'DevOps Engineer',
  'Cloud Engineer',
  'Data Analyst',
  'Data Scientist',
  'Machine Learning Engineer',
  'AI Engineer',
  'Cyber Security Analyst',
  'QA Engineer',
  'Mobile App Developer',
  'UI/UX Designer',
];

function formatLabelList(values = []) {
  if (!Array.isArray(values)) {
    return String(values || '');
  }
  return values.length ? values.join(', ') : 'None';
}

export default function Dashboard() {
  const { user, selectedRole, updateRole } = useAuth();
  const navigate = useNavigate();
  const [resumeFile, setResumeFile] = useState(null);
  const [role, setRole] = useState(selectedRole);
  const [loading, setLoading] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [dsaInsight, setDsaInsight] = useState(null);
  const [aptitudeInsight, setAptitudeInsight] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setRole(selectedRole);
  }, [selectedRole]);

  const loadResumes = async () => {
    const response = await api.get('/resume/user-resumes');
    setResumes(response.data);
  };

  useEffect(() => {
    loadResumes().catch(() => setResumes([]));
    const cachedInsight = localStorage.getItem(LATEST_DSA_INSIGHT_KEY);
    if (cachedInsight) {
      try {
        setDsaInsight(JSON.parse(cachedInsight));
      } catch {
        localStorage.removeItem(LATEST_DSA_INSIGHT_KEY);
      }
    }
    const cachedAptitudeInsight = localStorage.getItem(LATEST_APTITUDE_INSIGHT_KEY);
    if (cachedAptitudeInsight) {
      try {
        setAptitudeInsight(JSON.parse(cachedAptitudeInsight));
      } catch {
        localStorage.removeItem(LATEST_APTITUDE_INSIGHT_KEY);
      }
    }
    loadLatestDsaInsight()
      .then((response) => {
        if (response?.has_result) {
          setDsaInsight(response);
          localStorage.setItem(LATEST_DSA_INSIGHT_KEY, JSON.stringify(response));
        }
      })
      .catch(() => {
        // Keep the cached assessment insight visible if the backend latest lookup is unavailable.
      });
    const userId = user?.id || user?._id;
    if (userId) {
      loadAptitudeDashboard(userId)
        .then((response) => {
          if (response?.has_result) {
            setAptitudeInsight(response);
            localStorage.setItem(LATEST_APTITUDE_INSIGHT_KEY, JSON.stringify(response));
          }
        })
        .catch(() => {
          loadLatestAptitudeInsight()
            .then((response) => {
              if (response?.has_result) {
                setAptitudeInsight(response);
                localStorage.setItem(LATEST_APTITUDE_INSIGHT_KEY, JSON.stringify(response));
              }
            })
            .catch(() => {
              // Keep cached data if the dashboard lookup is unavailable.
            });
        });
    }
  }, [user]);

  const recentResumes = useMemo(() => resumes.slice(0, 3), [resumes]);

  const handleRoleChange = async (event) => {
    const nextRole = event.target.value;
    setRole(nextRole);
    setError('');
    try {
      await updateRole(nextRole);
      setMessage(`Role updated to ${nextRole}`);
      window.setTimeout(() => setMessage(''), 2500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to update role');
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!resumeFile) return;
    if (resumeFile.type !== 'application/pdf' && !resumeFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF resume');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('role', role);
      formData.append('file', resumeFile, resumeFile.name);
      const response = await api.post('/resume/upload', formData);
      setMessage('Resume uploaded successfully');
      setResumeFile(null);
      await loadResumes();
      navigate(`/resumes/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="glass-panel overflow-hidden rounded-[2rem] p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-orange-200/90">Welcome back</p>
            <h1 className="section-title mt-3 text-4xl font-bold text-white sm:text-5xl">
              Hello, {user?.name || 'there'}.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              Use the sidebar to access the AI Placement Mentor & Mock Interview Coach. Select your target role and optionally upload a PDF profile or resume to help the system provide tailored interview preparation guidance.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/resumes" className="frost-button">
                Browse all resumes
              </Link>
              <Link to="/dsa-assessment" className="secondary-button">
                Start DSA Assessment
              </Link>
              <Link to="/aptitude-assessment" className="secondary-button">
                Start Aptitude Assessment
              </Link>
              <Link to="/mock-interview" className="secondary-button">
                Start Mock Interview
              </Link>
              <Link to="/profile" className="secondary-button">
                View profile
              </Link>
            </div>
          </div>

          {/* Sidebar now contains tech cards and status info */}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleUpload} className="glass-panel rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Upload resume</p>
              <h2 className="section-title mt-2 text-2xl font-bold text-white">Add a PDF</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Target role</label>
              <select value={role} onChange={handleRoleChange} className="frost-input">
                {ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-slate-900 text-white">
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Resume PDF</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
                className="frost-input file:mr-4 file:rounded-xl file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:font-semibold file:text-slate-950"
                required
              />
            </div>
          </div>

          {message && <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}
          {error && <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

          <button type="submit" disabled={loading} className="frost-button mt-6 w-full">
            {loading ? 'Uploading...' : 'Upload and extract'}
          </button>
        </form>

        <Sidebar recentResumes={recentResumes} role={role} />
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">New module</p>
            <h2 className="section-title mt-2 text-2xl font-bold text-white">DSA Assessment</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Start a 60-minute coding assessment with random questions from Arrays, Strings, Trees, Graphs, and Dynamic Programming. The module includes an editor, timed execution, anti-cheating checks, and a personalized roadmap after submission.
            </p>
          </div>
          <Link to="/dsa-assessment" className="frost-button">
            Launch module
          </Link>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">New module</p>
            <h2 className="section-title mt-2 text-2xl font-bold text-white">Aptitude Assessment</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Start a 45-question aptitude test with quantitative aptitude, logical reasoning, and analytical verbal ability.
              The module auto-saves answers, evaluates section-wise performance, and generates a 4-week roadmap after submission.
            </p>
          </div>
          <Link to="/aptitude-assessment" className="frost-button">
            Launch module
          </Link>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">New module</p>
            <h2 className="section-title mt-2 text-2xl font-bold text-white">AI Mock Interview Agent</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Launch a 10-question role-based interview experience that uses your selected role, resume context, and AI-generated feedback to help you prepare for placement rounds.
            </p>
          </div>
          <Link to="/mock-interview" className="frost-button">
            Launch module
          </Link>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">DSA Insights</p>
            <h2 className="section-title mt-2 text-2xl font-bold text-white">Latest submission summary</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Your latest submitted assessment appears here with score, strengths, weak topics, and learning roadmap.
            </p>
          </div>
        </div>

        {dsaInsight?.has_result ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Overall score</p>
              <p className="mt-3 text-4xl font-bold text-white">{Math.round(dsaInsight.result.overall_score)}/100</p>
              <p className="mt-2 text-sm text-slate-400">Submitted at {new Date(dsaInsight.result.submitted_at).toLocaleString()}</p>
              <div className="mt-5 grid gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Strengths</p>
                  <p className="mt-2 text-sm text-slate-200">{formatLabelList(dsaInsight.result.strengths)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Weak areas</p>
                  <p className="mt-2 text-sm text-slate-200">{formatLabelList(dsaInsight.result.weak_areas)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">AI recommendations</p>
                  <p className="mt-2 text-sm text-slate-200">{formatLabelList(dsaInsight.result.ai_recommendations)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(dsaInsight.result.roadmap || []).map((item) => (
                <article key={item.topic} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.topic}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Roadmap</h3>
                  <p className="mt-3 text-sm text-slate-300">Practice count: {item.recommended_practice_count}</p>
                  <p className="mt-2 text-sm text-slate-300">Concepts: {item.concepts_to_learn.slice(0, 3).join(', ')}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-400">
            No submitted DSA assessment yet. Complete one to save insights here.
          </div>
        )}
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Aptitude Insights</p>
            <h2 className="section-title mt-2 text-2xl font-bold text-white">Latest aptitude summary</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Track section scores, weak topics, roadmap progress, practice streak, and accuracy trends from the latest aptitude submission.
            </p>
          </div>
        </div>

        {aptitudeInsight?.has_result ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Overall score</p>
              <p className="mt-3 text-4xl font-bold text-white">{Math.round(aptitudeInsight.result.overall_score)}/100</p>
              <p className="mt-2 text-sm text-slate-400">Readiness: {aptitudeInsight.result.overall_readiness}</p>
              <div className="mt-5 grid gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Strong topics</p>
                  <p className="mt-2 text-sm text-slate-200">{formatLabelList(aptitudeInsight.result.strong_topics)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Weak topics</p>
                  <p className="mt-2 text-sm text-slate-200">{formatLabelList(aptitudeInsight.result.weak_topics)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Practice streak</p>
                  <p className="mt-2 text-sm text-slate-200">{aptitudeInsight.progress?.practice_streak || 0} days</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Roadmap progress</p>
                  <p className="mt-2 text-sm text-slate-200">{aptitudeInsight.progress?.roadmap_progress || 0}% complete</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(aptitudeInsight.result.section_scores || []).map((item) => (
                <article key={item.section} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.section_label}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Section score</h3>
                  <p className="mt-3 text-sm text-slate-300">Score: {Math.round(item.score)}/100</p>
                  <p className="mt-2 text-sm text-slate-300">Accuracy: {Math.round(item.accuracy_percentage)}%</p>
                  <p className="mt-2 text-sm text-slate-300">Time spent: {Math.round(item.time_spent_seconds / 60)} min</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-400">
            No submitted aptitude assessment yet. Complete one to save insights here.
          </div>
        )}
      </section>
    </div>
  );
}
