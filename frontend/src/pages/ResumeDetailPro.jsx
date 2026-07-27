import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import {
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

const sectionClass = 'rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4';
const RESUME_REPORT_KEY_PREFIX = 'resume_builder_resume_report_';
const RESUME_CACHE_KEY_PREFIX = 'resume_builder_resume_cache_';

function countList(value) {
  return Array.isArray(value) ? value.length : 0;
}

function getCompleteness(parsed) {
  return [
    { label: 'Education', value: countList(parsed.education) ? 100 : 0 },
    { label: 'Experience', value: countList(parsed.experience) ? 100 : 0 },
    { label: 'Projects', value: countList(parsed.projects) ? 100 : 0 },
    { label: 'Skills', value: countList(parsed.skills) ? 100 : 0 },
    { label: 'Certifications', value: countList(parsed.certifications) ? 100 : 0 },
    { label: 'Achievements', value: countList(parsed.achievements) ? 100 : 0 },
  ];
}

function deriveKeywordMatch(atsAnalysis) {
  if (!atsAnalysis) {
    return 0;
  }
  const missing = countList(atsAnalysis.missing_keywords);
  const score = Math.max(0, 100 - missing * 8);
  return Math.min(100, score);
}

function formatLabelList(values = []) {
  if (!Array.isArray(values)) {
    return String(values || '');
  }
  return values.length ? values.join(', ') : 'None';
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M12 3v10m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ResumeDetailPro() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [resume, setResume] = useState(() => location.state?.resume || null);
  const [error, setError] = useState('');
  const [atsAnalysis, setAtsAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const initialResumeLoadedRef = useRef(Boolean(location.state?.resume));

  useEffect(() => {
  const loadResume = async () => {
    try {
      const response = await api.get(`/resume/${id}`);

      setResume(response.data);

      localStorage.setItem(
        `${RESUME_CACHE_KEY_PREFIX}${id}`,
        JSON.stringify(response.data)
      );
    } catch (err) {
      console.error(err);
      setError("Unable to load resume");
    }
  };

  loadResume();
}, [id]);

  useEffect(() => {
    const cached = localStorage.getItem(`${RESUME_REPORT_KEY_PREFIX}${id}`);
    if (!cached) {
      return;
    }

    try {
      setAtsAnalysis(JSON.parse(cached));
    } catch {
      localStorage.removeItem(`${RESUME_REPORT_KEY_PREFIX}${id}`);
    }
  }, [id]);

  const parsed = resume?.parsed_data || {};
  const atsScore = atsAnalysis?.ats_score || 0;
  const keywordMatch = deriveKeywordMatch(atsAnalysis);
  const resumeStrength = useMemo(() => Math.min(100, countList(parsed.skills) * 12 + countList(parsed.projects) * 12 + countList(parsed.experience) * 12 + countList(parsed.education) * 12), [parsed]);
  const missingSkills = countList(atsAnalysis?.missing_skills);

  const handleDownload = async () => {
    try {
      const response = await api.get(`/resume/download/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', resume?.resume_file_name || 'resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Unable to download resume');
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this resume?');
    if (!confirmed) return;

    try {
      await api.delete(`/resume/${id}`);
      navigate('/resumes');
    } catch {
      setError('Unable to delete resume');
    }
  };

  const handleAnalyze = async () => {
      if (!resume?.extracted_text) {
    console.error("Resume Object:", resume);
    console.error("Extracted Text:", resume?.extracted_text);
    console.error("Parsed Data:", resume?.parsed_data);
    setAnalysisError('No extracted text available for ATS analysis');
    return;
}
    console.log('Starting ATS analysis for resume ID:', id);

    setAnalysisLoading(true);
    setAnalysisError('');
    try {
      const response = await api.post('/resume/analyze-ats', {
        selected_role: resume.role,
        resume_text: resume.extracted_text,
      });
      setAtsAnalysis(response.data);
      localStorage.setItem(`${RESUME_REPORT_KEY_PREFIX}${id}`, JSON.stringify(response.data));
    } catch (err) {
      setAnalysisError(err.response?.data?.detail || 'Unable to generate ATS analysis');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const downloadReport = () => {
    pageDownload(`resume-report-${id}.json`, { resume, atsAnalysis });
  };

  if (error && !resume) {
    return (
      <DashboardPage
        breadcrumb="Resume Analyzer / Report"
        title="Resume report unavailable"
        subtitle="The selected resume could not be loaded, but the page is still showing a clear error state instead of an empty screen."
        actions={<Link to="/resumes" className="secondary-button">Back</Link>}
      >
        <section className="glass-panel rounded-[2rem] p-6">
          <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>
        </section>
      </DashboardPage>
    );
  }

  if (!resume) {
    return (
      <DashboardPage
        breadcrumb="Resume Analyzer / Report"
        title="Loading resume report"
        subtitle="Fetching the resume data and latest analysis..."
        actions={<Link to="/resumes" className="secondary-button">Back</Link>}
      >
        <section className="glass-panel rounded-[2rem] p-6 text-slate-300">Loading resume preview...</section>
      </DashboardPage>
    );
  }

  const roadmap = atsAnalysis?.career_roadmap || {};
  const suggestionSeries = [
    { name: 'Current ATS', values: [Math.max(36, atsScore - 14), atsScore, Math.min(100, atsScore + 10)], color: '#a855f7' },
    { name: 'Keyword Match', values: [Math.max(30, keywordMatch - 12), keywordMatch, Math.min(100, keywordMatch + 8)], color: '#38bdf8' },
  ];

  return (
    <DashboardPage
      breadcrumb="Resume Analyzer / Report"
      title={resume.resume_file_name}
      subtitle="A premium ATS report that highlights resume quality, missing keywords, section breakdowns, and a focused improvement roadmap."
      actions={(
        <>
          <DownloadButton onClick={downloadReport} label="Download Report" />
          <button type="button" onClick={handleAnalyze} className="secondary-button" disabled={analysisLoading}>
            {analysisLoading ? 'Analyzing...' : 'Analyze ATS'}
          </button>
          <button type="button" onClick={handleDownload} className="secondary-button">
            Download PDF
          </button>
          <button type="button" onClick={handleDelete} className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-3 font-semibold text-rose-100 transition hover:bg-rose-500/15">
            Delete
          </button>
          <Link to="/resumes" className="secondary-button">
            Back
          </Link>
        </>
      )}
    >
      <div className="grid gap-5 xl:grid-cols-4">
        <MetricCard label="ATS Score" value={`${atsScore}/100`} detail="Primary parser score from the existing ATS backend." progress={atsScore} tone="violet" metric="ATS" />
        <MetricCard label="Keyword Match" value={`${keywordMatch}/100`} detail="How closely the resume matches the target role keywords." progress={keywordMatch} tone="cyan" metric="Match" />
        <MetricCard label="Resume Strength" value={`${resumeStrength}/100`} detail="Frontend-derived completeness signal from detected sections." progress={resumeStrength} tone="emerald" metric="Strength" />
        <MetricCard label="Missing Skills" value={`${missingSkills}`} detail="High-priority gaps called out by the ATS analyzer." progress={Math.max(0, 100 - missingSkills * 16)} tone="rose" metric="Gap" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard eyebrow="Resume Breakdown" title="Section quality" subtitle="Each section sits inside a distinct glass card with consistent sizing and spacing.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ['Education', parsed.education],
              ['Experience', parsed.experience],
              ['Projects', parsed.projects],
              ['Skills', parsed.skills],
              ['Certifications', parsed.certifications],
              ['Achievements', parsed.achievements],
            ].map(([label, items]) => (
              <div key={label} className={sectionClass}>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-bold text-white">{countList(items)}</p>
                <p className="mt-2 text-sm text-slate-300">{countList(items) ? `${label} detected in the uploaded resume.` : `No ${label.toLowerCase()} detected.`}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Resume Metadata" title="Candidate summary" subtitle="A clean snapshot of the current upload.">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Name', parsed.name],
              ['Email', parsed.email],
              ['Phone', parsed.phone_number],
              ['Role', resume.role],
            ].map(([label, value]) => (
              <div key={label} className={sectionClass}>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
                <p className="mt-2 break-words text-lg font-semibold text-white">{value || 'Not detected'}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard eyebrow="Charts" title="ATS signal and keyword match" subtitle="The charts are intentionally lightweight and use the current ATS output plus a projected target band.">
          <TrendChart title="ATS Score Trend" subtitle="Current score against a target improvement band." labels={['Baseline', 'Current', 'Target']} series={suggestionSeries} />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <ProgressList title="Skill Distribution" items={getCompleteness(parsed)} suffix="%" tone="violet" />
            <ProgressList title="Keyword Match" items={[{ label: 'Matched keywords', value: keywordMatch }, { label: 'Missing keywords', value: Math.max(0, 100 - keywordMatch) }]} suffix="%" tone="cyan" />
            <ProgressList title="Section Score" items={[{ label: 'ATS score', value: atsScore }, { label: 'Resume strength', value: resumeStrength }]} suffix="%" tone="emerald" />
          </div>
        </SectionCard>

        <SectionCard eyebrow="ATS Feedback" title="AI feedback and recommendations" subtitle="Strengths, weaknesses, missing keywords, and practical suggestions are organized into readable cards.">
          {analysisError ? <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{analysisError}</p> : null}
          {atsAnalysis ? (
            <div className="space-y-4">
              <PillCloud title="Strengths" items={atsAnalysis.strengths || []} tone="emerald" />
              <PillCloud title="Weaknesses" items={atsAnalysis.missing_skills || []} tone="amber" />
              <PillCloud title="Missing Keywords" items={atsAnalysis.missing_keywords || []} tone="rose" />
              <PillCloud title="Suggestions" items={atsAnalysis.improvement_suggestions || []} tone="violet" />
            </div>
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-400">
              Run ATS analysis to surface strengths, weaknesses, and the improvement checklist.
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Timeline
          title="Learning Roadmap"
          subtitle="Weekly priorities are derived from the current ATS response and shaped into an easy-to-follow roadmap."
          steps={[
            { title: 'Week 1', description: `Focus on ${formatLabelList(roadmap.skills_to_learn || ['Resume fundamentals'])}.`, meta: 'Priority skills' },
            { title: 'Week 2', description: `Build ${formatLabelList(roadmap.projects || ['1 project'])} that reflect the target role.`, meta: 'Portfolio' },
            { title: 'Week 3', description: `Complete ${formatLabelList(roadmap.certifications || ['one certification'])} and revise ATS keywords.`, meta: 'Credentials' },
            { title: 'Week 4', description: `Target an expected ATS of ${roadmap.expected_ats_after_improvement ?? atsScore}/100 after refinements.`, meta: 'Goal' },
          ]}
          accent="violet"
        />

        <SectionCard eyebrow="Resume Optimization" title="Checklist" subtitle="A polished checklist gives the user a concrete action plan rather than a wall of text.">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              'Use a role-specific headline.',
              'Quantify achievements with metrics.',
              'Add missing ATS keywords naturally.',
              'Keep sections short and scannable.',
              'Add project outcomes and impact.',
              'Align certifications to the target role.',
            ].map((item) => (
              <div key={item} className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard eyebrow="Raw Extracted Text" title="Resume source" subtitle="The original extracted text remains available for debugging and traceability.">
        <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-[1.4rem] border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200">
          {resume.extracted_text || 'No text extracted from the uploaded PDF.'}
        </pre>
      </SectionCard>
    </DashboardPage>
  );
}