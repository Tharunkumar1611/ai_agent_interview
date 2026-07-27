import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';

const sectionClass = 'rounded-2xl border border-white/10 bg-white/5 p-4';

export default function ResumeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [error, setError] = useState('');
  const [atsAnalysis, setAtsAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    api
      .get(`/resume/${id}`)
      .then((response) => setResume(response.data))
      .catch(() => setError('Unable to load resume details'));
  }, [id]);

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
      navigate('/my-resumes');
    } catch {
      setError('Unable to delete resume');
    }
  };

  const handleAnalyze = async () => {
    if (!resume?.extracted_text) {
      setAnalysisError('No extracted text available for ATS analysis');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError('');
    try {
      const response = await api.post('/resume/analyze-ats', {
        selected_role: resume.role,
        resume_text: resume.extracted_text,
      });
      setAtsAnalysis(response.data);
    } catch (err) {
      setAnalysisError(err.response?.data?.detail || 'Unable to generate ATS analysis');
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (error) {
    return <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>;
  }

  if (!resume) {
    return <div className="glass-panel rounded-[2rem] p-6 text-slate-300">Loading resume preview...</div>;
  }

  const parsed = resume.parsed_data || {};

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Resume preview</p>
            <h1 className="section-title mt-2 text-3xl font-bold text-white">{resume.resume_file_name}</h1>
            <p className="mt-2 text-slate-300">Role: {resume.role}</p>
            <p className="mt-1 text-sm text-slate-400">Uploaded {new Date(resume.uploaded_at).toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleAnalyze} className="frost-button" disabled={analysisLoading}>
              {analysisLoading ? 'Analyzing...' : 'Analyze ATS'}
            </button>
            <button type="button" onClick={handleDownload} className="secondary-button">
              Download
            </button>
            <button type="button" onClick={handleDelete} className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-3 font-semibold text-red-200 transition hover:bg-red-500/15">
              Delete
            </button>
            <Link to="/my-resumes" className="secondary-button">
              Back
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className={sectionClass}>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Personal details</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label="Name" value={parsed.name} />
            <Detail label="Email" value={parsed.email} />
            <Detail label="Phone" value={parsed.phone_number} />
            <Detail label="Role" value={resume.role} />
          </div>
        </div>

        <div className={sectionClass}>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Skills</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(parsed.skills || []).length > 0 ? (
              parsed.skills.map((skill) => (
                <span key={skill} className="rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1 text-sm text-orange-100">
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-400">No skills detected.</p>
            )}
          </div>
        </div>

        <SectionList title="Education" items={parsed.education || []} />
        <SectionList title="Projects" items={parsed.projects || []} />
        <SectionList title="Experience" items={parsed.experience || []} />
        <SectionList title="Certifications" items={parsed.certifications || []} />
      </section>

      {(atsAnalysis || analysisError) && (
        <section className="glass-panel rounded-[2rem] p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">ATS analysis</p>
              <h2 className="section-title mt-2 text-2xl font-bold text-white">Groq evaluation</h2>
            </div>
            {atsAnalysis && <div className="rounded-2xl border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-2xl font-bold text-orange-100">{atsAnalysis.ats_score}/100</div>}
          </div>

          {analysisError && <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{analysisError}</p>}

          {atsAnalysis && (
            <div className="space-y-5">
              <SectionList title="Strengths" items={atsAnalysis.strengths || []} />
              <SectionList title="Missing Skills" items={atsAnalysis.missing_skills || []} />
              <SectionList title="Missing Certifications" items={atsAnalysis.missing_certifications || []} />
              <SectionList title="Missing Keywords" items={atsAnalysis.missing_keywords || []} />
              <SectionList title="Recommended Skills" items={atsAnalysis.recommended_skills || []} />
              <SectionList title="ATS Keywords" items={atsAnalysis.ats_keywords || []} />

              <div className="grid gap-4 lg:grid-cols-2">
                {(atsAnalysis.recommended_projects || []).map((project) => (
                  <div key={project.title} className={sectionClass}>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Recommended Project</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{project.title}</h3>
                    <p className="mt-2 text-sm text-slate-300">{project.reason}</p>
                    <p className="mt-3 text-sm text-slate-400">Difficulty: {project.difficulty}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(project.technologies || []).map((technology) => (
                        <span key={technology} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                          {technology}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className={sectionClass}>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Improvement suggestions</p>
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  {(atsAnalysis.improvement_suggestions || []).map((suggestion) => (
                    <div key={suggestion} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>

              <div className={sectionClass}>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Career roadmap</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Detail label="Skills to learn" value={(atsAnalysis.career_roadmap?.skills_to_learn || []).join(', ')} />
                  <Detail label="Certifications" value={(atsAnalysis.career_roadmap?.certifications || []).join(', ')} />
                  <Detail label="Projects to build" value={(atsAnalysis.career_roadmap?.projects || []).join(', ')} />
                  <Detail label="Expected ATS" value={`${atsAnalysis.career_roadmap?.expected_ats_after_improvement ?? 0}/100`} />
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <section className={sectionClass}>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Raw extracted text</p>
        <pre className="mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200">
          {resume.extracted_text || 'No text extracted from the uploaded PDF.'}
        </pre>
      </section>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-white">{value || 'Not detected'}</p>
    </div>
  );
}

function SectionList({ title, items }) {
  return (
    <div className={sectionClass}>
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{title}</p>
      <div className="mt-4 space-y-3 text-sm text-slate-200">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={`${title}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              {item}
            </div>
          ))
        ) : (
          <p className="text-slate-400">No {title.toLowerCase()} detected.</p>
        )}
      </div>
    </div>
  );
}
