import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  loadAptitudeReport,
  startAptitudeAssessment,
  submitAptitudeAssessment,
} from '../api/aptitude';

const LATEST_APTITUDE_INSIGHT_KEY = 'resume_builder_latest_aptitude_insight';
const DEFAULT_DURATION_SECONDS = 60 * 60;

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
  const remainingSeconds = String(safeSeconds % 60).padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

function formatLabelList(values = []) {
  return values.length ? values.join(' · ') : 'None yet';
}

function buildDraft(question) {
  return {
    selectedOption: null,
    markedForReview: false,
    timeSpentSeconds: 0,
    questionId: question?.id || null,
  };
}

function buildDraftMap(questions) {
  return questions.reduce((accumulator, question) => {
    accumulator[question.id] = buildDraft(question);
    return accumulator;
  }, {});
}

function StatCard({ label, value, helper, accent = 'from-violet-500 via-fuchsia-500 to-indigo-500' }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <div className={`mt-3 h-1.5 w-16 rounded-full bg-gradient-to-r ${accent}`} />
      <p className="mt-4 text-3xl font-bold text-white">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-400">{helper}</p> : null}
    </div>
  );
}

function ProgressBars({ title, labels, values, suffix = '' }) {
  const maxValue = Math.max(...values, 1);
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
      <h3 className="section-title text-lg font-semibold text-white">{title}</h3>
      <div className="mt-5 space-y-4">
        {labels.map((label, index) => {
          const value = values[index] ?? 0;
          const width = `${Math.max(6, (value / maxValue) * 100)}%`;
          return (
            <div key={label}>
              <div className="flex items-center justify-between gap-4 text-sm text-slate-300">
                <span>{label}</span>
                <span>{value.toFixed(1)}{suffix}</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-white/8">
                <div className="h-3 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500" style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PillList({ title, items, tone = 'slate' }) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
      : tone === 'amber'
        ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
        : tone === 'rose'
          ? 'border-rose-400/20 bg-rose-500/10 text-rose-100'
          : 'border-white/10 bg-white/5 text-slate-200';

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
      <h3 className="section-title text-lg font-semibold text-white">{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">None yet</span>
        ) : (
          items.map((item) => (
            <span key={item} className={`rounded-full px-3 py-2 text-sm ${toneClass}`}>
              {item}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function RoadmapCard({ item }) {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="section-title text-xl font-semibold text-white">{item.week}</h3>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">
          Roadmap step
        </span>
      </div>
      <div className="mt-4 space-y-4 text-sm text-slate-300">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Focus</p>
          <p className="mt-2 leading-7 text-slate-200">{item.focus}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Topics</p>
          <ul className="mt-2 space-y-1 pl-4 list-disc">
            {item.topics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Practice</p>
          <ul className="mt-2 space-y-1 pl-4 list-disc">
            {item.practice.map((practiceItem) => (
              <li key={practiceItem}>{practiceItem}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Goal</p>
          <p className="mt-2 leading-7 text-slate-200">{item.goal}</p>
        </div>
      </div>
    </article>
  );
}

function DailyPlanCard({ item }) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.day}</p>
        <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] text-slate-200">
          {item.mode}
        </span>
      </div>
      <h4 className="mt-2 text-base font-semibold text-white">{item.focus}</h4>
      <div className="mt-3 space-y-1 text-xs text-slate-300">
        {item.drills.map((drill) => (
          <p key={drill}>{drill}</p>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">Target questions: {item.target_questions}</p>
    </article>
  );
}

export default function AptitudeAssessment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const shellRef = useRef(null);
  const [assessment, setAssessment] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [report, setReport] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_DURATION_SECONDS);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const questionSessionRef = useRef({ questionId: null, startedAt: null });
  const autoSubmitLockRef = useRef(false);

  const questions = assessment?.questions || [];
  const currentIndex = Math.max(0, questions.findIndex((question) => question.id === currentQuestionId));
  const currentQuestion = useMemo(
    () => questions.find((question) => question.id === currentQuestionId) || questions[0] || null,
    [currentQuestionId, questions],
  );
  const currentDraft = currentQuestion ? drafts[currentQuestion.id] || buildDraft(currentQuestion) : null;
  const answeredCount = questions.filter((question) => Boolean(drafts[question.id]?.selectedOption)).length;
  const markedCount = questions.filter((question) => Boolean(drafts[question.id]?.markedForReview)).length;
  const progressPercent = questions.length ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
  const totalScore = report?.overall_score ?? 0;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = assessment ? 'hidden' : previousOverflow;

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [assessment]);

  useEffect(() => {
    if (!assessment || document.fullscreenElement) {
      return undefined;
    }

    const requestFullscreen = async () => {
      try {
        if (shellRef.current?.requestFullscreen) {
          await shellRef.current.requestFullscreen();
          return;
        }
        if (document.documentElement?.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // If fullscreen is blocked, the fixed overlay still keeps the assessment full-screen in-app.
      }
    };

    requestFullscreen();
    return undefined;
  }, [assessment]);

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen exit failures.
    }
  };

  const saveActiveTime = () => {
    if (!currentQuestionId || !questionSessionRef.current.startedAt) {
      return;
    }
    const elapsedSeconds = Math.max(0, (Date.now() - questionSessionRef.current.startedAt) / 1000);
    setDrafts((previous) => {
      const previousDraft = previous[currentQuestionId];
      if (!previousDraft) {
        return previous;
      }
      return {
        ...previous,
        [currentQuestionId]: {
          ...previousDraft,
          timeSpentSeconds: previousDraft.timeSpentSeconds + elapsedSeconds,
        },
      };
    });
    questionSessionRef.current.startedAt = Date.now();
  };

  const activateQuestion = (questionId) => {
    if (questionId === currentQuestionId) {
      return;
    }
    saveActiveTime();
    setCurrentQuestionId(questionId);
    questionSessionRef.current = { questionId, startedAt: Date.now() };
  };

  useEffect(() => {
    if (!assessment) {
      setTimeRemaining(DEFAULT_DURATION_SECONDS);
      return undefined;
    }

    const endsAt = new Date(assessment.ends_at).getTime();
    const tick = window.setInterval(() => {
      const secondsLeft = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setTimeRemaining(secondsLeft);
      if (secondsLeft === 0 && !autoSubmitLockRef.current) {
        autoSubmitLockRef.current = true;
        handleSubmitAssessment('timer-expired');
      }
    }, 1000);

    return () => window.clearInterval(tick);
  }, [assessment]);

  useEffect(() => {
    if (!assessment) {
      return undefined;
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setMessage('Your answers are auto-saved while you navigate between questions.');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [assessment]);

  useEffect(() => {
    questionSessionRef.current = {
      questionId: currentQuestionId,
      startedAt: currentQuestionId ? Date.now() : null,
    };
  }, [currentQuestionId]);

  useEffect(() => {
    const cached = localStorage.getItem(LATEST_APTITUDE_INSIGHT_KEY);
    if (!cached) {
      return;
    }

    try {
      const parsed = JSON.parse(cached);
      if (parsed?.has_result && parsed.result) {
        setReport(parsed.result);
      }
    } catch {
      localStorage.removeItem(LATEST_APTITUDE_INSIGHT_KEY);
    }
  }, []);

  const startAssessment = async () => {
    setIsStarting(true);
    setError('');
    setMessage('');
    try {
      await exitFullscreen();
      const response = await startAptitudeAssessment();
      setAssessment(response);
      setDrafts(buildDraftMap(response.questions));
      setCurrentQuestionId(response.questions[0]?.id || null);
      setReport(null);
      setTimeRemaining(DEFAULT_DURATION_SECONDS);
      questionSessionRef.current = { questionId: response.questions[0]?.id || null, startedAt: Date.now() };
      setMessage('Aptitude assessment started. The 60-minute timer is now running.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to start the assessment');
    } finally {
      setIsStarting(false);
    }
  };

  const updateCurrentDraft = (nextPatch) => {
    if (!currentQuestionId) {
      return;
    }
    setDrafts((previous) => ({
      ...previous,
      [currentQuestionId]: {
        ...(previous[currentQuestionId] || buildDraft(currentQuestion)),
        ...nextPatch,
      },
    }));
  };

  const handleOptionSelect = (option) => {
    updateCurrentDraft({ selectedOption: option });
    setMessage('Answer auto-saved for this question.');
  };

  const toggleMarkForReview = () => {
    updateCurrentDraft({ markedForReview: !currentDraft?.markedForReview });
  };

  const handleSubmitAssessment = async (reason = 'manual') => {
    if (!assessment || isSubmitting || (autoSubmitLockRef.current && reason !== 'timer-expired')) {
      return;
    }
    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      saveActiveTime();
      const attempts = questions.map((question) => {
        const draft = drafts[question.id] || buildDraft(question);
        return {
          question_id: question.id,
          selected_option: draft.selectedOption,
          marked_for_review: Boolean(draft.markedForReview),
          time_spent_seconds: Math.round(draft.timeSpentSeconds),
        };
      });
      const response = await submitAptitudeAssessment(assessment.assessment_id, attempts);
      setReport(response);
      localStorage.setItem(LATEST_APTITUDE_INSIGHT_KEY, JSON.stringify({ has_result: true, result: response, assessment: { assessment_id: assessment.assessment_id } }));
      setMessage(reason === 'timer-expired' ? 'Assessment auto-submitted when the timer expired.' : 'Assessment submitted successfully.');
      autoSubmitLockRef.current = true;
      await exitFullscreen();
      navigate('/dashboard', { replace: true });
      loadAptitudeReport(assessment.assessment_id)
        .then((latest) => {
          localStorage.setItem(
            LATEST_APTITUDE_INSIGHT_KEY,
            JSON.stringify({ has_result: true, result: latest.result, assessment: latest.assessment || { assessment_id: assessment.assessment_id } }),
          );
        })
        .catch(() => {
          // The dashboard will still show the locally cached submission result.
        });
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestionNumber = currentIndex + 1;
  const sectionProgress = report?.performance_summary?.section_progress || { labels: [], scores: [] };
  const topicProgress = report?.performance_summary?.topic_progress || { labels: [], scores: [] };
  const difficultyProgress = report?.performance_summary?.difficulty_progress || { labels: [], scores: [] };

  const questionStatus = (question) => {
    if (question.id === currentQuestionId) {
      return 'current';
    }
    const draft = drafts[question.id];
    if (draft?.markedForReview) {
      return 'review';
    }
    if (draft?.selectedOption) {
      return 'answered';
    }
    return 'not_answered';
  };

  const paletteTone = (status) => {
    if (status === 'current') return 'border-violet-400/40 bg-violet-500/15 text-white shadow-lg shadow-violet-500/10';
    if (status === 'review') return 'border-fuchsia-400/40 bg-fuchsia-500/15 text-white';
    if (status === 'answered') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
    return 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10';
  };

  if (!assessment) {
    return (
      <div ref={shellRef} className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-white">
        <div className="relative min-h-full px-4 py-6 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(79,112,198,0.24),transparent_30%),linear-gradient(180deg,#08111f_0%,#0f172a_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.36),rgba(0,0,0,0.05))]" />
          <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col gap-8">
            <section className="glass-panel overflow-hidden rounded-[2rem] p-8">
              <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-violet-200/90">Aptitude Assessment Module</p>
                  <h1 className="section-title mt-3 text-4xl font-bold text-white sm:text-5xl">
                    45-question aptitude test for placement readiness.
                  </h1>
                  <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                    Practice quantitative aptitude, logical reasoning, and analytical verbal skills in a timed MCQ format.
                    The module auto-saves answers, tracks your progress, and generates a personalized roadmap after submission.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" onClick={startAssessment} disabled={isStarting} className="frost-button">
                      {isStarting ? 'Starting assessment...' : 'Start Aptitude Assessment'}
                    </button>
                    <Link to="/dashboard" className="secondary-button">
                      Back to dashboard
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <StatCard label="Questions" value="45" helper="15 per section" accent="from-cyan-500 to-sky-300" />
                  <StatCard label="Timer" value="60 min" helper="Auto-submit on expiry" accent="from-fuchsia-500 to-pink-400" />
                  <StatCard label="Sections" value="3" helper="Quant, Reasoning, Verbal" accent="from-emerald-500 to-lime-300" />
                  <StatCard label="Autosave" value="Active" helper="Answered and marked-for-review states" accent="from-violet-500 to-indigo-400" />
                </div>
              </div>
            </section>

            {error ? <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

            {report ? (
              <section className="space-y-6 pb-8">
                <div className="glass-panel rounded-[2rem] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Previous test marks</p>
                      <h2 className="section-title mt-2 text-3xl font-bold text-white">Latest aptitude report</h2>
                    </div>
                    <StatCard label="Overall Aptitude Score" value={`${Math.round(report.overall_score)}/100`} helper={report.overall_readiness} accent="from-emerald-500 to-lime-300" />
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                  <ProgressBars title="Section-wise Performance" labels={sectionProgress.labels} values={sectionProgress.scores} suffix="%" />
                  <ProgressBars title="Topic-wise Performance" labels={topicProgress.labels} values={topicProgress.scores} suffix="%" />
                  <ProgressBars title="Difficulty-wise Performance" labels={difficultyProgress.labels} values={difficultyProgress.scores} suffix="%" />
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                  <PillList title="Strong Topics" items={report.strong_topics || []} tone="green" />
                  <PillList title="Weak Topics" items={report.weak_topics || []} tone="amber" />
                  <PillList title="Most Incorrect Areas" items={report.most_incorrect_areas || []} tone="rose" />
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                  <PillList title="Speed Issues" items={report.speed_issues || []} tone="slate" />
                  <PillList title="Accuracy Issues" items={report.accuracy_issues || []} tone="slate" />
                  <PillList title="Confidence Level" items={[report.confidence_level || 'Unknown']} tone="green" />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  {(report.roadmap || []).map((item) => (
                    <RoadmapCard key={item.week} item={item} />
                  ))}
                </div>

                <div className="glass-panel rounded-[2rem] p-6">
                  <h3 className="section-title text-2xl font-bold text-white">30-day roadmap</h3>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {(report.daily_practice_plan || []).map((item) => (
                      <DailyPlanCard key={item.day} item={item} />
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={shellRef} className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-white">
      <div className="relative min-h-full px-4 py-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(79,112,198,0.24),transparent_30%),linear-gradient(180deg,#08111f_0%,#0f172a_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.36),rgba(0,0,0,0.05))]" />
        <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1800px] flex-col gap-6">
          <section className="glass-panel rounded-[2rem] p-5 lg:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-violet-200/90">Aptitude Assessment Running</p>
                <h1 className="section-title mt-2 text-3xl font-bold text-white sm:text-4xl">
                  Focus mode for {user?.name || 'the candidate'}
                </h1>
                <p className="mt-2 text-sm text-slate-300">Fullscreen exam mode is active. Answers are auto-saved while you move between questions.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[30rem]">
                <StatCard label="Time Remaining" value={formatTime(timeRemaining)} helper="60 minute assessment" accent="from-violet-500 to-indigo-400" />
                <StatCard label="Answered" value={String(answeredCount)} helper="Auto-saved answers" accent="from-emerald-500 to-lime-300" />
                <StatCard label="Current Score" value={`${Math.round(totalScore)}/100`} helper="Updated after submission" accent="from-fuchsia-500 to-pink-400" />
              </div>
            </div>
            {message ? <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}
            {error ? <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
          </section>

          <section className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="space-y-6 xl:sticky xl:top-6 xl:h-[calc(100vh-10rem)] xl:overflow-y-auto xl:pr-1">
              <div className="glass-panel rounded-[2rem] p-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: 'Answered', value: answeredCount },
                    { label: 'Not answered', value: questions.length - answeredCount },
                    { label: 'Marked for review', value: markedCount },
                    { label: 'Progress', value: `${progressPercent}%` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 h-2 rounded-full bg-white/8">
                  <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              <div className="glass-panel rounded-[2rem] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Question palette</p>
                    <h3 className="section-title mt-1 text-2xl font-semibold text-white">Navigate 45 questions</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1">Answered</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Not answered</span>
                    <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-2 py-1">Marked</span>
                    <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1">Current</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-9 xl:grid-cols-5">
                  {questions.map((question, index) => {
                    const status = questionStatus(question);
                    return (
                      <button
                        type="button"
                        key={question.id}
                        onClick={() => activateQuestion(question.id)}
                        className={`rounded-2xl border px-3 py-3 text-center text-sm font-semibold transition ${paletteTone(status)}`}
                      >
                        <span className="block text-xs uppercase tracking-[0.2em] text-current/70">{index + 1}</span>
                        <span className="mt-1 block text-[11px] uppercase tracking-[0.18em] text-current/65">
                          {question.section === 'Quantitative Aptitude' ? 'Quant' : question.section === 'Logical Reasoning' ? 'Logic' : 'Verbal'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {currentQuestion ? (
                <div className="glass-panel rounded-[2rem] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-slate-400">{currentQuestion.section}</p>
                      <h2 className="section-title mt-2 text-3xl font-bold text-white">Question {currentQuestionNumber}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">{currentQuestion.topic}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">{currentQuestion.difficulty}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">{currentQuestion.marks} mark</span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                      <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
                        <p>Question {currentQuestionNumber} of {questions.length}</p>
                        <p>Progress {progressPercent}%</p>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white/8">
                        <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500" style={{ width: `${progressPercent}%` }} />
                      </div>
                      <p className="mt-4 leading-7 text-slate-200">{currentQuestion.question}</p>
                    </div>

                    <div className="grid gap-3">
                      {currentQuestion.options.map((option) => {
                        const isSelected = currentDraft?.selectedOption === option;
                        return (
                          <button
                            type="button"
                            key={option}
                            onClick={() => handleOptionSelect(option)}
                            className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${isSelected ? 'border-violet-400/40 bg-violet-500/15 text-white shadow-lg shadow-violet-500/10' : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10'}`}
                          >
                            <span className="text-sm font-semibold">{option}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={toggleMarkForReview} className="secondary-button">
                        {currentDraft?.markedForReview ? 'Unmark Review' : 'Mark for Review'}
                      </button>
                      <button
                        type="button"
                        onClick={() => activateQuestion(questions[currentIndex - 1]?.id)}
                        disabled={currentIndex <= 0}
                        className="secondary-button disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => activateQuestion(questions[currentIndex + 1]?.id)}
                        disabled={currentIndex >= questions.length - 1}
                        className="secondary-button disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-6 xl:sticky xl:top-6 xl:h-[calc(100vh-10rem)] xl:overflow-y-auto xl:pl-1">
              <div className="glass-panel rounded-[2rem] p-5 lg:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Controls</p>
                    <h3 className="section-title mt-1 text-2xl font-semibold text-white">Assessment actions</h3>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <button type="button" onClick={() => handleSubmitAssessment('manual')} disabled={isSubmitting} className="frost-button">
                    {isSubmitting ? 'Submitting...' : 'Submit Test'}
                  </button>
                  <button type="button" onClick={startAssessment} className="secondary-button">
                    Restart assessment
                  </button>
                  <Link to="/dashboard" className="secondary-button text-center">
                    Leave module
                  </Link>
                </div>
              </div>

              <div className="glass-panel rounded-[2rem] p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Current question</p>
                <div className="mt-4 space-y-4 text-sm text-slate-200">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Topic</p>
                    <p className="mt-2 text-base font-semibold text-white">{currentQuestion?.topic}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Difficulty</p>
                    <p className="mt-2 text-base font-semibold text-white">{currentQuestion?.difficulty}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Selected answer</p>
                    <p className="mt-2 text-base font-semibold text-white">{currentDraft?.selectedOption || 'Not answered yet'}</p>
                  </div>
                </div>
              </div>

              {report ? (
                <div className="glass-panel rounded-[2rem] p-5">
                  <h3 className="section-title text-lg font-semibold text-white">Quick summary</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <StatCard label="Overall score" value={`${Math.round(report.overall_score)}/100`} helper="MCQ accuracy" accent="from-emerald-500 to-lime-300" />
                    <StatCard label="Accuracy" value={`${Math.round(report.accuracy_percentage)}%`} helper="Correct answers ÷ total" accent="from-cyan-500 to-sky-300" />
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {report ? (
            <section className="space-y-6 pb-8">
              <div className="glass-panel rounded-[2rem] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Performance Dashboard</p>
                    <h2 className="section-title mt-2 text-3xl font-bold text-white">AI aptitude analysis report</h2>
                  </div>
                  <StatCard label="Overall Aptitude Score" value={`${Math.round(report.overall_score)}/100`} helper={report.overall_readiness} accent="from-emerald-500 to-lime-300" />
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <ProgressBars title="Section-wise Performance" labels={sectionProgress.labels} values={sectionProgress.scores} suffix="%" />
                <ProgressBars title="Topic-wise Performance" labels={topicProgress.labels} values={topicProgress.scores} suffix="%" />
                <ProgressBars title="Difficulty-wise Performance" labels={difficultyProgress.labels} values={difficultyProgress.scores} suffix="%" />
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <PillList title="Strong Topics" items={report.strong_topics || []} tone="green" />
                <PillList title="Weak Topics" items={report.weak_topics || []} tone="amber" />
                <PillList title="Most Incorrect Areas" items={report.most_incorrect_areas || []} tone="rose" />
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <PillList title="Speed Issues" items={report.speed_issues || []} tone="slate" />
                <PillList title="Accuracy Issues" items={report.accuracy_issues || []} tone="slate" />
                <PillList title="Confidence Level" items={[report.confidence_level || 'Unknown']} tone="green" />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="glass-panel rounded-[2rem] p-6">
                  <h3 className="section-title text-2xl font-bold text-white">AI Feedback</h3>
                  <div className="mt-5 space-y-4 text-sm text-slate-200">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Strengths</p>
                      <div className="mt-2 space-y-2">
                        {(report.ai_feedback?.strengths || []).map((item) => (
                          <p key={item}>{item}</p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Weaknesses</p>
                      <div className="mt-2 space-y-2">
                        {(report.ai_feedback?.weaknesses || []).map((item) => (
                          <p key={item}>{item}</p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Recommendations</p>
                      <div className="mt-2 space-y-2">
                        {(report.ai_feedback?.recommendations || []).map((item) => (
                          <p key={item}>{item}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-[2rem] p-6">
                  <h3 className="section-title text-2xl font-bold text-white">AI Summary</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {(report.ai_summary || []).map((item) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 p-5 text-sm text-emerald-100">
                    {report.overall_readiness}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                {(report.roadmap || []).map((item) => (
                  <RoadmapCard key={item.week} item={item} />
                ))}
              </div>

              <div className="glass-panel rounded-[2rem] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Daily Practice Plan</p>
                    <h3 className="section-title mt-2 text-2xl font-bold text-white">30-day roadmap</h3>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {(report.daily_practice_plan || []).map((item) => (
                    <DailyPlanCard key={item.day} item={item} />
                  ))}
                </div>
              </div>

              <div className="glass-panel rounded-[2rem] p-6">
                <h3 className="section-title text-2xl font-bold text-white">Question Results</h3>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {(report.question_results || []).map((questionResult) => (
                    <div key={questionResult.question_id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{questionResult.section}</p>
                          <h4 className="mt-1 text-lg font-semibold text-white">{questionResult.topic}</h4>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${questionResult.is_correct ? 'bg-emerald-500/15 text-emerald-100' : 'bg-rose-500/15 text-rose-100'}`}>
                          {questionResult.is_correct ? 'Correct' : 'Wrong'}
                        </span>
                      </div>
                      <p className="mt-3 leading-7 text-slate-200">{questionResult.question}</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <p>Selected: {questionResult.selected_option || 'Not answered'}</p>
                        <p>Correct: {questionResult.correct_answer}</p>
                        <p>Time: {questionResult.time_spent_seconds}s</p>
                        <p>Marks: {questionResult.marks_awarded}/{questionResult.marks}</p>
                      </div>
                      <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
                        {questionResult.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
