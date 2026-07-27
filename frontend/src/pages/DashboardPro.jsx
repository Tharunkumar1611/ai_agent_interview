import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { loadAptitudeDashboard, loadLatestAptitudeInsight } from '../api/aptitude';
import { loadLatestDsaInsight } from '../api/dsa';
import { useAuth } from '../context/AuthContext';
import ResumeCard from '../components/ResumeCard';
import {
  AgentCard,
  DashboardPage,
  DownloadButton,
  MetricCard,
  PillCloud,
  ProgressList,
  SectionCard,
  Timeline,
  TrendChart,
  pageDownload,
} from '../components/dashboard/Analytics';

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

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M12 4a4.5 4.5 0 0 0-4.5 4.5V11c0 .9-.2 1.8-.6 2.6L6 15.3A1 1 0 0 0 6.8 17h10.4a1 1 0 0 0 .8-1.7l-.9-1.7c-.4-.8-.6-1.7-.6-2.6V8.5A4.5 4.5 0 0 0 12 4Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.5 17.5a2.6 2.6 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function computeResumeScore(resume) {
  if (!resume) {
    return 0;
  }

  const parsed = resume.parsed_data || {};
  const sections = [
    parsed.name,
    parsed.email,
    parsed.phone_number,
    parsed.skills?.length,
    parsed.education?.length,
    parsed.experience?.length,
    parsed.projects?.length,
    parsed.certifications?.length,
    parsed.achievements?.length,
  ];

  const weights = [10, 10, 8, 15, 14, 14, 15, 8, 6];
  const score = sections.reduce((total, item, index) => total + (item && item !== 0 ? weights[index] : 0), 0);
  return Math.min(100, score);
}

function getModuleStatus(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 45) return 'Needs focus';
  return 'Starting out';
}

function getModuleTone(score) {
  if (score >= 80) return 'emerald';
  if (score >= 65) return 'violet';
  if (score >= 45) return 'amber';
  return 'rose';
}

export default function DashboardPro() {
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

    const cachedDsa = localStorage.getItem(LATEST_DSA_INSIGHT_KEY);
    if (cachedDsa) {
      try {
        setDsaInsight(JSON.parse(cachedDsa));
      } catch {
        localStorage.removeItem(LATEST_DSA_INSIGHT_KEY);
      }
    }

    const cachedAptitude = localStorage.getItem(LATEST_APTITUDE_INSIGHT_KEY);
    if (cachedAptitude) {
      try {
        setAptitudeInsight(JSON.parse(cachedAptitude));
      } catch {
        localStorage.removeItem(LATEST_APTITUDE_INSIGHT_KEY);
      }
    }

    loadLatestDsaInsight().then((response) => {
      if (response?.has_result) {
        setDsaInsight(response);
        localStorage.setItem(LATEST_DSA_INSIGHT_KEY, JSON.stringify(response));
      }
    }).catch(() => {});

    const userId = user?.id || user?._id;
    if (userId) {
      loadAptitudeDashboard(userId).then((response) => {
        if (response?.has_result) {
          setAptitudeInsight(response);
          localStorage.setItem(LATEST_APTITUDE_INSIGHT_KEY, JSON.stringify(response));
        }
      }).catch(() => {
        loadLatestAptitudeInsight().then((response) => {
          if (response?.has_result) {
            setAptitudeInsight(response);
            localStorage.setItem(LATEST_APTITUDE_INSIGHT_KEY, JSON.stringify(response));
          }
        }).catch(() => {});
      });
    }
  }, [user]);

  const recentResumes = useMemo(() => resumes.slice(0, 3), [resumes]);
  const latestResume = useMemo(() => {
    if (!resumes.length) return null;
    return [...resumes].sort((left, right) => new Date(right.uploaded_at) - new Date(left.uploaded_at))[0];
  }, [resumes]);

  const resumeScore = computeResumeScore(latestResume);
  const dsaScore = dsaInsight?.result?.overall_score ?? 0;
  const aptitudeScore = aptitudeInsight?.result?.overall_score ?? 0;
  const availableScores = [resumeScore, dsaScore, aptitudeScore].filter((value) => value > 0);
  const readinessScore = availableScores.length ? Math.round(availableScores.reduce((sum, value) => sum + value, 0) / availableScores.length) : 0;
  const resumeStatus = getModuleStatus(resumeScore);
  const dsaStatus = getModuleStatus(dsaScore);
  const aptitudeStatus = getModuleStatus(aptitudeScore);
  const resumeTone = getModuleTone(resumeScore);
  const dsaTone = getModuleTone(dsaScore);
  const aptitudeTone = getModuleTone(aptitudeScore);
  const avatarLabel = (user?.name || 'U').slice(0, 2).toUpperCase();

  const handleRoleChange = async (event) => {
    const nextRole = event.target.value;
    setRole(nextRole);
    setError('');
    try {
      await updateRole(nextRole);
      setMessage(`Role updated to ${nextRole}`);
      window.setTimeout(() => setMessage(''), 2400);
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

  const downloadSnapshot = () => {
    pageDownload('dashboard-snapshot.json', {
      user: { name: user?.name, email: user?.email, role: selectedRole },
      readinessScore,
      resumeScore,
      dsaScore,
      aptitudeScore,
      latestResume,
      dsaInsight,
      aptitudeInsight,
      recentResumes,
    });
  };

  const moduleSeries = [
    { name: 'Resume', values: [Math.max(30, resumeScore - 12), resumeScore, Math.min(100, resumeScore + 8)], color: '#a855f7' },
    { name: 'DSA', values: [Math.max(25, dsaScore - 14), dsaScore, Math.min(100, dsaScore + 10)], color: '#38bdf8' },
    { name: 'Aptitude', values: [Math.max(28, aptitudeScore - 11), aptitudeScore, Math.min(100, aptitudeScore + 9)], color: '#22c55e' },
  ];

  const focusAreas = [
    ...(dsaInsight?.result?.weak_areas || []),
    ...(aptitudeInsight?.result?.weak_topics || []),
    ...(latestResume?.parsed_data?.skills?.length ? [] : ['Resume skills section needs enrichment']),
  ].slice(0, 6);

  const nextSteps = [
    {
      title: 'Resume Analyzer',
      description: latestResume ? `Review ${latestResume.resume_file_name} and raise the ATS quality score.` : 'Upload a resume to generate your first report.',
      meta: `${resumeScore}% score`,
    },
    {
      title: 'DSA Agent',
      description: dsaInsight?.has_result ? `Work on ${formatLabelList(dsaInsight.result.weak_areas)} to move into the next band.` : 'Attempt the coding assessment to capture your baseline.',
      meta: `${dsaScore}% score`,
    },
    {
      title: 'Aptitude Agent',
      description: aptitudeInsight?.has_result ? `Sharpen ${formatLabelList(aptitudeInsight.result.weak_topics)} with timed MCQ practice.` : 'Attempt the aptitude assessment to unlock your roadmap.',
      meta: `${aptitudeScore}% score`,
    },
  ];

  const dashboardActions = (
    <>
      <DownloadButton onClick={downloadSnapshot} label="Download Snapshot" />
      <button type="button" className="secondary-button px-4 py-3" onClick={() => navigate('/resumes')}>
        My Resumes
      </button>
    </>
  );

  return (
    <DashboardPage
      breadcrumb="Dashboard / Overview"
      title={`Welcome Back, ${user?.name || 'there'} 👋`}
      subtitle="Let's crack your dream offer with a polished workspace that tracks resume quality, coding progress, and aptitude readiness in one place."
      actions={dashboardActions}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs uppercase tracking-[0.24em] text-slate-400">Target Role</label>
          <select value={role} onChange={handleRoleChange} className="frost-input min-w-[14rem] max-w-xs">
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option} className="bg-slate-900 text-white">
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-violet-400/30 hover:bg-white/10">
            <BellIcon />
          </button>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 text-sm font-bold text-white shadow-lg shadow-violet-500/20">
              {avatarLabel}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-slate-400">{selectedRole}</p>
            </div>
          </div>
        </div>
      </div>

      {message ? <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

      <SectionCard eyebrow="Upload resume" title="Add a PDF" subtitle="Attach your latest resume to generate ATS insights and keep your dashboard profile current.">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Target role</label>
            <select value={role} onChange={handleRoleChange} className="frost-input min-w-[14rem] max-w-xs">
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

          <button type="submit" disabled={loading} className="frost-button w-full">
            {loading ? 'Uploading...' : 'Upload and extract'}
          </button>
        </form>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-4">
        <MetricCard label="Overall Readiness Score" value={`${readinessScore}%`} detail="Combined signal from your latest resume, DSA, and aptitude modules." progress={readinessScore} metric="Dream offer" tone="violet" />
        <MetricCard label="Resume Score" value={`${resumeScore}%`} detail={resumeStatus === 'Starting out' ? 'Upload a resume to begin ATS analysis.' : 'ATS score and resume quality signal.'} progress={resumeScore} metric={resumeStatus} tone={resumeTone} />
        <MetricCard label="DSA Progress" value={`${dsaScore}%`} detail={dsaStatus === 'Starting out' ? 'Attempt the coding assessment to see your baseline.' : 'Coding and problem-solving readiness.'} progress={dsaScore} metric={dsaStatus} tone={dsaTone} />
        <MetricCard label="Aptitude Progress" value={`${aptitudeScore}%`} detail={aptitudeStatus === 'Starting out' ? 'Take the aptitude assessment to generate your roadmap.' : 'Quantitative, logical, and verbal readiness.'} progress={aptitudeScore} metric={aptitudeStatus} tone={aptitudeTone} />
      </div>

      <SectionCard eyebrow="AI Agents Overview" title="Specialized modules" subtitle="Four premium cards surface the exact modules the platform understands. Each one reuses the same visual language and routes into the relevant report surface.">
        <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-4">
          <AgentCard title="Resume Analyzer" subtitle="ATS Score & Resume Quality" score={`${resumeScore}%`} status={resumeStatus} tags={latestResume ? ['ATS Score', 'Resume quality', latestResume.resume_file_name] : ['ATS Score', 'Resume quality']} to={latestResume ? `/resumes/${latestResume.id}` : '/resumes'} state={latestResume ? { resume: latestResume } : undefined} tone="violet" badge="R" />
          <AgentCard title="DSA Agent" subtitle="Coding & Problem Solving" score={`${dsaScore}%`} status={dsaStatus} tags={['Coding', 'Problem solving', 'Algorithms']} to="/dsa-assessment" tone="cyan" badge="D" />
          <AgentCard title="Aptitude Agent" subtitle="Quantitative, Logical & Verbal" score={`${aptitudeScore}%`} status={aptitudeStatus} tags={['Quant', 'Logic', 'Verbal']} to="/aptitude-assessment" tone="emerald" badge="A" />
          <AgentCard title="Mock Interview" subtitle="Role-based interview coaching" score="New" status="Ready" tags={['Voice prep', 'AI feedback', 'Roadmap']} to="/mock-interview" tone="amber" badge="M" />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard eyebrow="Learning Progress" title="Score mix and focus areas" subtitle="A clean chart-led view of your latest scores, plus the topics currently holding you back.">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <ProgressList title="Module Scores" items={[{ label: 'Resume Analyzer', value: resumeScore }, { label: 'DSA Agent', value: dsaScore }, { label: 'Aptitude Agent', value: aptitudeScore }]} suffix="%" tone="violet" />
            <PillCloud title="Focus Areas" items={focusAreas.length ? focusAreas : ['No open weak areas yet']} tone="amber" />
          </div>
          <div className="mt-6">
            <TrendChart title="Learning momentum" subtitle="Baseline to goal progression across the three modules." labels={['Baseline', 'Current', 'Goal']} series={moduleSeries} />
          </div>
        </SectionCard>

        <Timeline title="Next steps" subtitle="A short plan derived from your latest module outcomes." steps={nextSteps} accent="violet" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard eyebrow="Recent Uploads" title="Latest resumes" subtitle="Your most recent PDFs stay a click away for quick review." action={<button type="button" className="secondary-button" onClick={() => navigate('/resumes')}>Open library</button>}>
          <div className="grid gap-4">
            {recentResumes.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-400">
                No uploads yet. Upload a PDF to see a polished summary here.
              </div>
            ) : (
              recentResumes.map((resume) => <ResumeCard key={resume.id} resume={resume} compact />)
            )}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Module Notes" title="Latest feedback snippets" subtitle="The dashboard keeps your latest learning signal visible without forcing you into each report.">
          <div className="space-y-4 text-sm text-slate-200">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Resume</p>
              <p className="mt-2 leading-7 text-slate-300">
                {latestResume ? `Uploaded ${latestResume.resume_file_name}. Open the report for ATS breakdowns and missing skill insights.` : 'Upload a resume to generate the analyzer report.'}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">DSA</p>
              <p className="mt-2 leading-7 text-slate-300">{dsaInsight?.has_result ? `Weak areas: ${formatLabelList(dsaInsight.result.weak_areas)}.` : 'Attempt the DSA assessment to capture topic-wise progress.'}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Aptitude</p>
              <p className="mt-2 leading-7 text-slate-300">{aptitudeInsight?.has_result ? `Weak topics: ${formatLabelList(aptitudeInsight.result.weak_topics)}.` : 'Attempt the aptitude assessment to generate your roadmap.'}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </DashboardPage>
  );
}