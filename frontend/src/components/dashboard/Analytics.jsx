import { Link } from 'react-router-dom';

const DEFAULT_TONE = {
  violet: 'from-violet-500/90 via-fuchsia-500/80 to-indigo-500/80',
  cyan: 'from-cyan-500/90 via-sky-500/80 to-indigo-500/80',
  emerald: 'from-emerald-500/90 via-teal-500/80 to-cyan-500/80',
  amber: 'from-amber-400/90 via-orange-400/80 to-rose-400/80',
  rose: 'from-rose-500/90 via-pink-500/80 to-fuchsia-500/80',
};

export function pageDownload(name, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function DashboardPage({ breadcrumb, title, subtitle, actions, children, className = '' }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <section className="glass-panel overflow-hidden rounded-[2rem] border-white/10 bg-white/5 p-6 shadow-[0_25px_80px_rgba(4,6,20,0.45)] sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            {breadcrumb ? <p className="text-xs uppercase tracking-[0.36em] text-violet-200/75">{breadcrumb}</p> : null}
            <h1 className="section-title mt-3 text-3xl font-bold text-white sm:text-4xl">{title}</h1>
            {subtitle ? <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </section>
      {children}
    </div>
  );
}

export function SectionCard({ eyebrow, title, subtitle, action, children, className = '' }) {
  return (
    <section className={`glass-panel rounded-[1.5rem] border-white/10 bg-white/[0.045] p-5 shadow-[0_16px_50px_rgba(5,8,25,0.36)] sm:p-6 ${className}`}>
      {(eyebrow || title || action) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow ? <p className="text-xs uppercase tracking-[0.28em] text-violet-200/70">{eyebrow}</p> : null}
            {title ? <h2 className="section-title mt-2 text-2xl font-bold text-white">{title}</h2> : null}
            {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

export function MetricCard({ label, value, detail, progress, tone = 'violet', metric, className = '' }) {
  const accent = DEFAULT_TONE[tone] || DEFAULT_TONE.violet;
  return (
    <article className={`glass-panel relative overflow-hidden rounded-[1.5rem] border-white/10 bg-white/[0.05] p-5 shadow-[0_16px_55px_rgba(5,8,25,0.34)] ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold text-white">{value}</p>
          {detail ? <p className="mt-2 max-w-[15rem] text-sm leading-6 text-slate-300">{detail}</p> : null}
        </div>
        {typeof progress === 'number' ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <RingProgress value={progress} tone={tone} />
            {metric ? <span className="max-w-[7.5rem] text-[11px] uppercase tracking-[0.22em] text-slate-400">{metric}</span> : null}
          </div>
        ) : null}
      </div>
      <div className={`mt-5 h-1.5 w-full rounded-full bg-gradient-to-r ${accent}`} />
    </article>
  );
}

export function RingProgress({ value = 0, size = 88, stroke = 10, tone = 'violet' }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;
  const track = tone === 'emerald' ? '#22c55e' : tone === 'cyan' ? '#38bdf8' : tone === 'amber' ? '#f59e0b' : tone === 'rose' ? '#fb7185' : '#a855f7';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold text-white">{Math.round(clamped)}%</span>
      </div>
    </div>
  );
}

export function AgentCard({ title, subtitle, score, status, tags = [], actionLabel = 'View Report →', onAction, href, to, state, tone = 'violet', badge }) {
  const accent = DEFAULT_TONE[tone] || DEFAULT_TONE.violet;
  const button = (
    <button type="button" onClick={onAction} className="secondary-button mt-4 w-full justify-center border-white/10 bg-white/5 text-sm text-white hover:border-violet-400/30">
      {actionLabel}
    </button>
  );

  return (
    <article className="group glass-panel flex h-full flex-col rounded-[1.5rem] border-white/10 bg-white/[0.05] p-5 shadow-[0_16px_55px_rgba(5,8,25,0.34)] transition duration-300 hover:-translate-y-1 hover:border-violet-400/20 hover:bg-white/[0.07]">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-lg font-bold text-white shadow-lg shadow-violet-500/20`}>
          {badge}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Score</p>
          <p className="mt-2 text-3xl font-bold text-white">{score}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">{status}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto">
        {to ? (
          <Link to={to} state={state} className="secondary-button mt-5 block text-center text-sm">
            {actionLabel}
          </Link>
        ) : href ? (
          <a href={href} className="secondary-button mt-5 block text-center text-sm">
            {actionLabel}
          </a>
        ) : (
          button
        )}
      </div>
    </article>
  );
}

export function ProgressList({ title, items = [], suffix = '', tone = 'violet' }) {
  const accent = DEFAULT_TONE[tone] || DEFAULT_TONE.violet;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <section className="glass-panel rounded-[1.5rem] border-white/10 bg-white/[0.05] p-5 shadow-[0_16px_50px_rgba(5,8,25,0.34)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="section-title text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="mt-5 space-y-4">
        {items.map((item) => {
          const width = `${Math.max(6, (item.value / max) * 100)}%`;
          return (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-4 text-sm text-slate-300">
                <span>{item.label}</span>
                <span>{item.value.toFixed(1)}{suffix}</span>
              </div>
              <div className="h-3 rounded-full bg-white/8">
                <div className={`h-3 rounded-full bg-gradient-to-r ${accent} transition-all duration-500`} style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TrendChart({ title, subtitle, series = [], labels = [] }) {
  const width = 680;
  const height = 240;
  const padding = 28;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const max = Math.max(...series.flatMap((entry) => entry.values), 1);
  const min = Math.min(...series.flatMap((entry) => entry.values), 0);
  const range = Math.max(1, max - min);

  const pointsFor = (values) => values.map((value, index) => {
    const x = padding + (plotWidth / Math.max(values.length - 1, 1)) * index;
    const y = padding + plotHeight - ((value - min) / range) * plotHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <section className="glass-panel rounded-[1.5rem] border-white/10 bg-white/[0.05] p-5 shadow-[0_16px_50px_rgba(5,8,25,0.34)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="section-title text-lg font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-2 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-5 h-60 w-full overflow-visible">
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1={padding} x2={width - padding} y1={padding + (plotHeight / 3) * line} y2={padding + (plotHeight / 3) * line} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 8" />
        ))}
        {series.map((entry) => (
          <g key={entry.name}>
            <polyline points={pointsFor(entry.values)} fill="none" stroke={entry.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            {entry.values.map((value, index) => {
              const x = padding + (plotWidth / Math.max(entry.values.length - 1, 1)) * index;
              const y = padding + plotHeight - ((value - min) / range) * plotHeight;
              return <circle key={`${entry.name}-${index}`} cx={x} cy={y} r="4.5" fill={entry.color} stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" />;
            })}
          </g>
        ))}
        {labels.map((label, index) => {
          const x = padding + (plotWidth / Math.max(labels.length - 1, 1)) * index;
          return <text key={label} x={x} y={height - 4} textAnchor="middle" fill="rgba(226,232,240,0.72)" fontSize="11">{label}</text>;
        })}
      </svg>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
        {series.map((entry) => (
          <span key={entry.name} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
            {entry.name}
          </span>
        ))}
      </div>
    </section>
  );
}

export function Timeline({ title, subtitle, steps = [], accent = 'violet' }) {
  return (
    <section className="glass-panel rounded-[1.5rem] border-white/10 bg-white/[0.05] p-5 shadow-[0_16px_50px_rgba(5,8,25,0.34)] sm:p-6">
      <div>
        <h3 className="section-title text-lg font-semibold text-white">{title}</h3>
        {subtitle ? <p className="mt-2 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="mt-5 space-y-4">
        {steps.map((step, index) => (
          <div key={step.title} className="flex items-start gap-4">
            <div className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${DEFAULT_TONE[accent] || DEFAULT_TONE.violet} text-sm font-bold text-white shadow-lg shadow-violet-500/20`}>
              {index + 1}
            </div>
            <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="font-semibold text-white">{step.title}</h4>
                {step.meta ? <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">{step.meta}</span> : null}
              </div>
              {step.description ? <p className="mt-2 text-sm leading-6 text-slate-300">{step.description}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PillCloud({ title, items = [], tone = 'violet' }) {
  const accent = tone === 'emerald'
    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
    : tone === 'cyan'
      ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100'
      : tone === 'rose'
        ? 'border-rose-400/20 bg-rose-500/10 text-rose-100'
        : tone === 'amber'
          ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
          : 'border-violet-400/20 bg-violet-500/10 text-violet-100';

  return (
    <section className="glass-panel rounded-[1.5rem] border-white/10 bg-white/[0.05] p-5 shadow-[0_16px_50px_rgba(5,8,25,0.34)] sm:p-6">
      <h3 className="section-title text-lg font-semibold text-white">{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {items.length ? items.map((item) => (
          <span key={item} className={`rounded-full px-3 py-2 text-sm ${accent}`}>
            {item}
          </span>
        )) : <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">None yet</span>}
      </div>
    </section>
  );
}

export function DownloadButton({ onClick, label = 'Download Report' }) {
  return (
    <button type="button" onClick={onClick} className="frost-button">
      {label}
    </button>
  );
}