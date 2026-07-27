import { Link } from 'react-router-dom';

const RESUME_CACHE_KEY_PREFIX = 'resume_builder_resume_cache_';

export default function ResumeCard({ resume, onDelete, onDownload, compact = false }) {
  const cacheResume = () => {
    localStorage.setItem(`${RESUME_CACHE_KEY_PREFIX}${resume.id}`, JSON.stringify(resume));
  };

  return (
    <article className="glass-panel rounded-[1.5rem] border-white/10 bg-white/[0.05] p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-400/20 hover:bg-white/[0.07]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-violet-200/80">{resume.role}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{resume.resume_file_name}</h3>
          <p className="mt-1 text-sm text-slate-400">Uploaded {new Date(resume.uploaded_at).toLocaleString()}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          PDF
        </span>
      </div>

      {!compact && resume.parsed_data && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 sm:grid-cols-2">
          <div>
            <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Name</span>
            <p className="mt-1">{resume.parsed_data.name || 'Not detected'}</p>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Email</span>
            <p className="mt-1 break-all">{resume.parsed_data.email || 'Not detected'}</p>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link to={`/resumes/${resume.id}`} state={{ resume }} onClick={cacheResume} className="secondary-button text-sm">
          View details
        </Link>
        <button type="button" onClick={() => onDownload(resume.id)} className="secondary-button text-sm">
          Download
        </button>
        <button type="button" onClick={() => onDelete(resume.id)} className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15">
          Delete
        </button>
      </div>
    </article>
  );
}
