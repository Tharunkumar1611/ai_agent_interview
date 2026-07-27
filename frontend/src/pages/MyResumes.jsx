import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import ResumeCard from '../components/ResumeCard';

export default function MyResumes() {
  const [resumes, setResumes] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const navigate = useNavigate();

  const loadResumes = async () => {
    const response = await api.get('/resume/user-resumes');
    setResumes(response.data);
  };

  useEffect(() => {
    loadResumes().catch(() => setError('Unable to load resumes'));
  }, []);

  const handleDownload = async (resumeId) => {
    try {
      const response = await api.get(`/resume/download/${resumeId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Unable to download resume');
    }
  };

  const handleDelete = async (resumeId) => {
    const confirmed = window.confirm('Delete this resume?');
    if (!confirmed) return;

    try {
      setBusyId(resumeId);
      await api.delete(`/resume/${resumeId}`);
      await loadResumes();
    } catch {
      setError('Unable to delete resume');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Resume library</p>
            <h1 className="section-title mt-2 text-3xl font-bold text-white">My Resumes</h1>
            <p className="mt-2 text-slate-300">Download, inspect, or delete any uploaded PDF from your account.</p>
          </div>
          <button type="button" onClick={() => navigate('/dashboard')} className="secondary-button">
            Back to dashboard
          </button>
        </div>
      </section>

      {error && <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      <div className="grid gap-5">
        {resumes.length === 0 ? (
          <div className="glass-panel rounded-[2rem] p-8 text-sm text-slate-400">
            You have not uploaded any resumes yet.
          </div>
        ) : (
          resumes.map((resume) => (
            <div key={resume.id} className="relative">
              {busyId === resume.id && <div className="absolute inset-0 rounded-[2rem] bg-slate-950/40" />}
              <ResumeCard resume={resume} onDownload={handleDownload} onDelete={handleDelete} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
