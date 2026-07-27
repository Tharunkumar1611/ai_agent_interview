import { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadDsaReport, recordDsaViolation, runDsaCode, startDsaAssessment, submitDsaAssessment } from '../api/dsa';

const LATEST_DSA_INSIGHT_KEY = 'resume_builder_latest_dsa_insight';

const LANGUAGE_OPTIONS = [
  { id: 'python', label: 'Python', monaco: 'python' },
  { id: 'java', label: 'Java', monaco: 'java' },
  { id: 'cpp', label: 'C++', monaco: 'cpp' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
];

const TOPIC_COLORS = {
  Arrays: 'from-violet-500 via-fuchsia-500 to-indigo-500',
  Strings: 'from-cyan-500 to-sky-300',
  Trees: 'from-emerald-500 to-teal-300',
  Graphs: 'from-fuchsia-500 to-violet-300',
  'Dynamic Programming': 'from-indigo-500 to-purple-400',
};

const QUESTION_ICONS = {
  Arrays: '01',
  Strings: '02',
  Trees: '03',
  Graphs: '04',
  'Dynamic Programming': '05',
};

const DEFAULT_LANGUAGE = 'python';
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

function buildDraft(question, language = DEFAULT_LANGUAGE) {
  return {
    language,
    code: question?.starter_code?.[language] || '',
    timeSpentSeconds: 0,
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
      <div className="flex items-center justify-between gap-4">
        <h3 className="section-title text-lg font-semibold text-white">{title}</h3>
      </div>
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
        <h3 className="section-title text-xl font-semibold text-white">{item.topic}</h3>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">
          {item.recommended_practice_count} problems
        </span>
      </div>
      <div className="mt-4 space-y-4 text-sm text-slate-300">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Concepts to learn</p>
          <ul className="mt-2 space-y-1 pl-4 list-disc">
            {item.concepts_to_learn.map((concept) => (
              <li key={concept}>{concept}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Important algorithms</p>
          <ul className="mt-2 space-y-1 pl-4 list-disc">
            {item.important_algorithms.map((algorithm) => (
              <li key={algorithm}>{algorithm}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Difficulty progression</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.difficulty_progression.map((level) => (
              <span key={level} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                {level}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function DSAAssessment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const shellRef = useRef(null);
  const [assessment, setAssessment] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [output, setOutput] = useState(null);
  const [report, setReport] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_DURATION_SECONDS);
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [violationCount, setViolationCount] = useState(0);
  const [antiCheatNote, setAntiCheatNote] = useState('');
  const questionSessionRef = useRef({ questionId: null, startedAt: null });
  const autoSubmitLockRef = useRef(false);

  useEffect(() => {
    const cached = localStorage.getItem(LATEST_DSA_INSIGHT_KEY);
    if (!cached) {
      return;
    }

    try {
      const parsed = JSON.parse(cached);
      if (parsed?.has_result && parsed.result) {
        setReport(parsed.result);
      }
    } catch {
      localStorage.removeItem(LATEST_DSA_INSIGHT_KEY);
    }
  }, []);

  const questions = assessment?.questions || [];
  const currentQuestion = useMemo(
    () => questions.find((question) => question.id === currentQuestionId) || questions[0] || null,
    [currentQuestionId, questions],
  );
  const currentDraft = currentQuestion ? drafts[currentQuestion.id] || buildDraft(currentQuestion) : null;
  const activeLanguage = currentDraft?.language || DEFAULT_LANGUAGE;
  const currentCode = currentDraft?.code || currentQuestion?.starter_code?.[activeLanguage] || '';

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
    setOutput(null);
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

    const recordViolation = async (type, note) => {
      if (isSubmitting) {
        return;
      }
      try {
        const response = await recordDsaViolation(assessment.assessment_id, {
          violation_type: type,
          message: note,
        });
        setViolationCount(response.violation_count);
        if (response.warning_level === 'warning') {
          setAntiCheatNote('Warning: focus changed once. Stay on the assessment tab.');
        } else if (response.warning_level === 'final_warning') {
          setAntiCheatNote('Final warning: another focus loss will auto-submit the assessment.');
        } else if (response.auto_submit_required) {
          setAntiCheatNote('Auto-submit triggered because violation limit was reached.');
          autoSubmitLockRef.current = true;
          await handleSubmitAssessment('anti-cheat');
        }
      } catch {
        setViolationCount((value) => value + 1);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordViolation('tab-switch', 'Page became hidden').catch(() => {});
      }
    };

    const onBlur = () => {
      recordViolation('window-blur', 'Window lost focus').catch(() => {});
    };

    const onCopyPaste = (event) => {
      event.preventDefault();
      recordViolation(event.type, 'Copy and paste are disabled during the assessment').catch(() => {});
      return false;
    };

    const onContextMenu = (event) => {
      event.preventDefault();
      recordViolation('right-click', 'Right-click is disabled during the assessment').catch(() => {});
      return false;
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopyPaste);
    document.addEventListener('paste', onCopyPaste);
    document.addEventListener('contextmenu', onContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopyPaste);
      document.removeEventListener('paste', onCopyPaste);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, [assessment, isSubmitting]);

  useEffect(() => {
    questionSessionRef.current = {
      questionId: currentQuestionId,
      startedAt: currentQuestionId ? Date.now() : null,
    };
  }, [currentQuestionId]);

  const startAssessment = async () => {
    setIsStarting(true);
    setError('');
    setMessage('');
    setAntiCheatNote('');
    try {
      await exitFullscreen();
      const response = await startDsaAssessment();
      setAssessment(response);
      setDrafts(buildDraftMap(response.questions));
      setCurrentQuestionId(response.questions[0]?.id || null);
      setViolationCount(0);
      setReport(null);
      setOutput(null);
      setTimeRemaining(DEFAULT_DURATION_SECONDS);
      questionSessionRef.current = { questionId: response.questions[0]?.id || null, startedAt: Date.now() };
      setMessage('Assessment started. The 60-minute timer is now running.');
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

  const handleLanguageChange = (event) => {
    const nextLanguage = event.target.value;
    const starterCode = currentQuestion?.starter_code?.[nextLanguage] || '';
    updateCurrentDraft({ language: nextLanguage, code: starterCode });
    setOutput(null);
  };

  const handleEditorChange = (nextCode) => {
    updateCurrentDraft({ code: nextCode ?? '' });
  };

  const handleSubmitCode = async () => {
    if (!assessment || !currentQuestion || !currentDraft) {
      return;
    }
    setIsRunning(true);
    setError('');
    setMessage('');
    try {
      const response = await runDsaCode({
        assessment_id: assessment.assessment_id,
        question_id: currentQuestion.id,
        language: currentDraft.language,
        code: currentDraft.code,
      });
      setOutput(response.result);
      if (response.result.status !== 'success') {
        setMessage('Code submitted for this question. Review the compiler/runtime message below.');
      } else {
        setMessage('Code submitted for this question. Review the test case results below.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to run code');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitAssessment = async (reason = 'manual') => {
    if (!assessment || isSubmitting || autoSubmitLockRef.current && reason !== 'anti-cheat' && reason !== 'timer-expired') {
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
          language: draft.language,
          code: draft.code,
          time_spent_seconds: Math.round(draft.timeSpentSeconds),
        };
      });
      const response = await submitDsaAssessment(assessment.assessment_id, attempts);
      setReport(response);
      localStorage.setItem(LATEST_DSA_INSIGHT_KEY, JSON.stringify({ has_result: true, result: response, assessment: { assessment_id: assessment.assessment_id } }));
      setMessage(reason === 'timer-expired' ? 'Assessment auto-submitted when the timer expired.' : 'Assessment submitted successfully.');
      autoSubmitLockRef.current = true;
      await exitFullscreen();
      navigate('/dashboard', { replace: true });
      loadDsaReport(assessment.assessment_id)
        .then((latest) => {
          localStorage.setItem(
            LATEST_DSA_INSIGHT_KEY,
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

  const totalScore = report?.overall_score ?? 0;
  const topicScores = report?.topic_scores || [];
  const chartLabels = topicScores.map((item) => item.topic);
  const scoreValues = topicScores.map((item) => item.score);
  const timeValues = topicScores.map((item) => item.time_spent_seconds / 60);
  const accuracyValues = topicScores.map((item) => item.total_test_cases ? (item.test_cases_passed / item.total_test_cases) * 100 : 0);

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
                  <p className="text-sm uppercase tracking-[0.28em] text-violet-200/90">DSA Assessment Module</p>
                  <h1 className="section-title mt-3 text-4xl font-bold text-white sm:text-5xl">
                    LeetCode-style timed coding assessment.
                  </h1>
                  <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                    Challenge yourself across Arrays, Strings, Trees, Graphs, and Dynamic Programming.
                    The module tracks focus violations, evaluates hidden test cases, and builds a personalized learning roadmap after submission.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" onClick={startAssessment} disabled={isStarting} className="frost-button">
                      {isStarting ? 'Starting assessment...' : 'Start DSA Assessment'}
                    </button>
                    <Link to="/dashboard" className="secondary-button">
                      Back to dashboard
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <StatCard label="Questions" value="5" helper="One from each topic" accent="from-cyan-500 to-sky-300" />
                  <StatCard label="Timer" value="60 min" helper="Auto-submit on expiry" accent="from-fuchsia-500 to-pink-400" />
                  <StatCard label="Languages" value="4" helper="Python, Java, C++, JavaScript" accent="from-emerald-500 to-lime-300" />
                  <StatCard label="Anti-cheat" value="Active" helper="Visibility, blur, copy, paste" accent="from-violet-500 to-indigo-400" />
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
                      <h2 className="section-title mt-2 text-3xl font-bold text-white">Latest DSA report</h2>
                    </div>
                    <StatCard label="Overall DSA Score" value={`${Math.round(report.overall_score)}/100`} helper="Topic-wise average after evaluation" accent="from-emerald-500 to-lime-300" />
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                  <ProgressBars title="Topic-wise Performance" labels={chartLabels} values={scoreValues} suffix="" />
                  <ProgressBars title="Time Spent per Topic" labels={chartLabels} values={timeValues} suffix=" min" />
                  <ProgressBars title="Accuracy per Topic" labels={chartLabels} values={accuracyValues} suffix="%" />
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                  <PillList title="Strengths" items={report.strengths || []} tone="green" />
                  <PillList title="Moderate Areas" items={report.moderate_areas || []} tone="amber" />
                  <PillList title="Weak Areas" items={report.weak_areas || []} tone="rose" />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  {(report.roadmap || []).map((item) => (
                    <RoadmapCard key={item.topic} item={item} />
                  ))}
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
                <p className="text-sm uppercase tracking-[0.28em] text-violet-200/90">DSA Assessment Running</p>
                <h1 className="section-title mt-2 text-3xl font-bold text-white sm:text-4xl">
                  Focus mode for {user?.name || 'the candidate'}
                </h1>
                <p className="mt-2 text-sm text-slate-300">Fullscreen exam mode is active. Do not switch tabs or leave the window.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[30rem]">
                <StatCard label="Time Remaining" value={formatTime(timeRemaining)} helper="60 minute assessment" accent="from-violet-500 to-indigo-400" />
                <StatCard label="Violations" value={String(violationCount)} helper="Third violation auto-submits" accent="from-fuchsia-500 to-pink-400" />
                <StatCard label="Current Score" value={`${Math.round(totalScore)}/100`} helper="Updated after submission" accent="from-emerald-500 to-lime-300" />
              </div>
            </div>
            {antiCheatNote ? <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{antiCheatNote}</p> : null}
            {message ? <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}
            {error ? <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
          </section>

          <section className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="space-y-6 xl:sticky xl:top-6 xl:h-[calc(100vh-10rem)] xl:overflow-y-auto xl:pr-1">
              <div className="glass-panel rounded-[2rem] p-5">
                <div className="flex flex-wrap gap-3">
                  {questions.map((question, index) => {
                    const isActive = question.id === currentQuestionId;
                    return (
                      <button
                        type="button"

                        key={question.id}
                        onClick={() => activateQuestion(question.id)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? 'border-violet-400/40 bg-violet-500/15 text-white shadow-lg shadow-violet-500/10'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <span className="block text-xs uppercase tracking-[0.24em] text-slate-500">
                          {QUESTION_ICONS[question.topic] || `0${index + 1}`} • {question.topic}
                        </span>
                        <span className="mt-1 block text-sm font-semibold">{question.title}</span>
                        <span className={`mt-2 inline-flex rounded-full bg-gradient-to-r px-2.5 py-1 text-xs font-semibold text-white ${TOPIC_COLORS[question.topic] || 'from-violet-500 via-fuchsia-500 to-indigo-500'}`}>
                          {question.difficulty}
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
                      <p className="text-sm uppercase tracking-[0.28em] text-slate-400">{currentQuestion.topic}</p>
                      <h2 className="section-title mt-2 text-3xl font-bold text-white">{currentQuestion.title}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">{currentQuestion.difficulty}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">{currentQuestion.function_name}</span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Problem statement</p>
                      <p className="mt-3 leading-7 text-slate-200">{currentQuestion.problem_statement}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Sample input</p>
                        <pre className="mt-3 overflow-x-auto text-sm leading-6 text-slate-200">{currentQuestion.sample_input}</pre>
                      </div>
                      <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Sample output</p>
                        <pre className="mt-3 overflow-x-auto text-sm leading-6 text-slate-200">{currentQuestion.sample_output}</pre>
                      </div>
                    </div>

                    <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Constraints</p>
                      <ul className="mt-3 space-y-2 pl-4 text-sm leading-7 text-slate-200 list-disc">
                        {currentQuestion.constraints.map((constraint) => (
                          <li key={constraint}>{constraint}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Explanation</p>
                      <p className="mt-3 leading-7 text-slate-200">{currentQuestion.explanation}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-6 xl:sticky xl:top-6 xl:h-[calc(100vh-10rem)] xl:overflow-y-auto xl:pl-1">
              <div className="glass-panel rounded-[2rem] p-5 lg:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Compiler</p>
                    <h3 className="section-title mt-1 text-2xl font-semibold text-white">Code editor</h3>
                  </div>
                  <select value={activeLanguage} onChange={handleLanguageChange} className="frost-input max-w-[10rem]">
                    {LANGUAGE_OPTIONS.map((language) => (
                      <option key={language.id} value={language.id} className="bg-slate-900 text-white">
                        {language.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/10">
                  <Editor
                    height="calc(100vh - 24rem)"
                    language={LANGUAGE_OPTIONS.find((language) => language.id === activeLanguage)?.monaco || 'python'}
                    value={currentCode}
                    theme="vs-dark"
                    onChange={handleEditorChange}
                    options={{
                      fontSize: 14,
                      minimap: { enabled: false },
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                    }}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={handleSubmitCode} disabled={isRunning} className="frost-button">
                    {isRunning ? 'Submitting...' : 'Submit Code'}
                  </button>
                  <button type="button" onClick={() => handleSubmitAssessment('manual')} disabled={isSubmitting} className="secondary-button">
                    {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
                  </button>
                </div>
              </div>

              <div className="glass-panel rounded-[2rem] p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Test case results</p>
                {output?.status && output.status !== 'success' ? (
                  <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    <p className="font-semibold">{output.status.replace(/_/g, ' ')}</p>
                    <p className="mt-2 text-sm text-rose-100/90">{output.message || 'Compilation or execution failed.'}</p>
                  </div>
                ) : null}
                {output?.details?.length ? (
                  <div className="mt-4 space-y-3">
                    {output.details.map((result, index) => (
                      <div key={`${result.index}-${index}`} className={`rounded-2xl border px-4 py-3 text-sm ${result.passed ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-rose-400/20 bg-rose-500/10 text-rose-100'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span>Test case {result.index}</span>
                          <span>{result.passed ? 'Passed' : 'Failed'}</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-300">Expected: {String(result.expected)} · Actual: {String(result.actual)} · {result.runtime_ms}ms</p>
                        {result.error ? <p className="mt-2 text-xs text-rose-100">{result.error}</p> : null}
                      </div>
                    ))}
                    <p className="text-sm text-slate-400">
                      {output.passed}/{output.total} test cases passed. Runtime: {output.average_runtime_ms}ms
                    </p>
                  </div>
                ) : null}
                {!output?.details?.length && output?.status === 'success' ? (
                  <p className="mt-3 text-sm text-slate-400">Run your code to see sample test case results here.</p>
                ) : null}
                {output?.status === 'success' && output?.message ? (
                  <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {output.message}
                  </p>
                ) : null}
              </div>

              <div className="glass-panel rounded-[2rem] p-5">
                <h3 className="section-title text-lg font-semibold text-white">Assessment controls</h3>
                <div className="mt-4 grid gap-3">
                  <button type="button" onClick={startAssessment} className="secondary-button">
                    Restart assessment
                  </button>
                  <Link to="/dashboard" className="secondary-button text-center">
                    Leave module
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {report ? (
            <section className="space-y-6 pb-8">
              <div className="glass-panel rounded-[2rem] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Performance Dashboard</p>
                    <h2 className="section-title mt-2 text-3xl font-bold text-white">AI skill analysis report</h2>
                  </div>
                  <StatCard label="Overall DSA Score" value={`${Math.round(report.overall_score)}/100`} helper="Topic-wise average after evaluation" accent="from-emerald-500 to-lime-300" />
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <ProgressBars title="Topic-wise Performance" labels={chartLabels} values={scoreValues} suffix="" />
                <ProgressBars title="Time Spent per Topic" labels={chartLabels} values={timeValues} suffix=" min" />
                <ProgressBars title="Accuracy per Topic" labels={chartLabels} values={accuracyValues} suffix="%" />
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <PillList title="Strengths" items={report.strengths || []} tone="green" />
                <PillList title="Moderate Areas" items={report.moderate_areas || []} tone="amber" />
                <PillList title="Weak Areas" items={report.weak_areas || []} tone="rose" />
              </div>

              <div className="glass-panel rounded-[2rem] p-6">
                <h3 className="section-title text-2xl font-bold text-white">AI Recommendations</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {(report.ai_recommendations || []).map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                {(report.roadmap || []).map((item) => (
                  <RoadmapCard key={item.topic} item={item} />
                ))}
              </div>

              <div className="glass-panel rounded-[2rem] p-6">
                <h3 className="section-title text-2xl font-bold text-white">Question Results</h3>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {(report.question_results || []).map((questionResult) => (
                    <div key={questionResult.question_id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{questionResult.topic}</p>
                          <h4 className="mt-1 text-lg font-semibold text-white">{questionResult.title}</h4>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${questionResult.score >= 75 ? 'bg-emerald-500/15 text-emerald-100' : questionResult.score >= 50 ? 'bg-amber-500/15 text-amber-100' : 'bg-rose-500/15 text-rose-100'}`}>
                          {Math.round(questionResult.score)}/100
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <p>Language: {questionResult.language}</p>
                        <p>Time: {questionResult.time_taken_seconds}s</p>
                        <p>Passed: {questionResult.test_cases_passed}/{questionResult.total_test_cases}</p>
                        <p>Efficiency: {Math.round(questionResult.execution_efficiency)}%</p>
                      </div>
                      {questionResult.status !== 'success' ? (
                        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                          <p className="font-semibold">{questionResult.status.replace(/_/g, ' ')}</p>
                          <p className="mt-1">{questionResult.message || 'No compiler output available.'}</p>
                        </div>
                      ) : null}
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
