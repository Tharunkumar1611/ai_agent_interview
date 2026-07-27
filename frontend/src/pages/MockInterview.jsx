import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  completeMockInterview,
  loadMockInterviewHistory,
  loadMockInterviewReport,
  moveMockInterviewToNext,
  startMockInterview,
  submitMockInterviewAnswer,
} from '../api/mockInterview';

function StatCard({ label, value, helper }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-400">{helper}</p> : null}
    </div>
  );
}

export default function MockInterview() {
  const { user, selectedRole } = useAuth();
  const [session, setSession] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const currentQuestion = session?.questions?.[questionIndex] || null;
  const progressPercent = useMemo(() => {
    if (!session?.questions?.length) return 0;
    return Math.round(((questionIndex + 1) / session.questions.length) * 100);
  }, [questionIndex, session]);

  const handleReadQuestion = () => {
    if (!currentQuestion?.question) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setError('Speech synthesis is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
    utterance.lang = 'en-US';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setMessage('Question read aloud.');
  };

  const handleStartVoiceInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) {
        setAnswer((previous) => (previous ? `${previous} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setError('Voice capture was interrupted. You can still type your answer.');
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setMessage('Listening for your answer...');
  };

  const handleStopVoiceInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = window.__mockInterviewRecognition;
    if (recognition) {
      recognition.stop();
    }
  };

  const loadHistory = async () => {
    try {
      const response = await loadMockInterviewHistory();
      setHistory(response.data.interviews || []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const startInterview = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await startMockInterview(selectedRole || user?.role || 'Software Engineer');
      setSession(response.data);
      setQuestionIndex(0);
      setAnswer('');
      setReport(null);
      setMessage('Mock interview started. Answer each question in your own words.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to start interview');
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = async () => {
    if (!session?.interview_id || !currentQuestion) return;
    setLoading(true);
    setError('');
    try {
      await submitMockInterviewAnswer({
        interview_id: session.interview_id,
        question_id: currentQuestion.id,
        answer,
        transcript: answer,
        answer_duration_seconds: 60,
        confidence: 0.85,
      });
      setMessage('Answer saved for this question.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to save answer');
    } finally {
      setLoading(false);
    }
  };

  const goNext = async () => {
    if (!session?.interview_id) return;
    setLoading(true);
    try {
      await saveAnswer();
      await moveMockInterviewToNext(session.interview_id);
      if (questionIndex < (session.questions.length || 1) - 1) {
        setQuestionIndex((previous) => previous + 1);
        setAnswer('');
      } else {
        const response = await completeMockInterview(session.interview_id);
        setReport(response.data.report);
        setMessage('Interview completed. Review your report below.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to move to next question');
    } finally {
      setLoading(false);
    }
  };

  const viewReport = async (interviewId) => {
    try {
      const response = await loadMockInterviewReport(interviewId);
      setReport(response.data.interview?.report || null);
      setMessage('Loaded previous interview report.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load report');
    }
  };

  return (
    <div className="space-y-8">
      <section className="glass-panel rounded-[2rem] p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-violet-200/90">AI Mock Interview Agent</p>
            <h1 className="section-title mt-3 text-4xl font-bold text-white">Voice-based interview practice</h1>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-300">
              The module uses your saved role and resume context to generate role-specific questions, collect spoken answers, and produce a personalized interview report with feedback and a learning roadmap.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={startInterview} disabled={loading} className="frost-button">
              {loading ? 'Starting...' : 'Start interview'}
            </button>
            <Link to="/dashboard" className="secondary-button">Back to dashboard</Link>
          </div>
        </div>
        {message ? <p className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Interview session</p>
              <h2 className="section-title mt-2 text-2xl font-bold text-white">{session ? `Role: ${session.selected_role}` : 'Ready to begin'}</h2>
            </div>
            <div className="flex gap-3">
              <StatCard label="Progress" value={`${progressPercent}%`} helper="questions completed" />
              <StatCard label="Role" value={selectedRole || user?.role || 'Software Engineer'} helper="saved from profile" />
            </div>
          </div>

          {session?.questions?.length ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>Question {questionIndex + 1} of {session.questions.length}</span>
                  <span>{currentQuestion?.category}</span>
                </div>
                <p className="mt-4 text-lg leading-8 text-slate-100">{currentQuestion?.question}</p>
              </div>
              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Speak or type your answer here..."
                className="min-h-[180px] w-full rounded-[1.4rem] border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-100 outline-none"
              />
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={handleReadQuestion} className="secondary-button">
                  {isSpeaking ? 'Speaking...' : 'Read question aloud'}
                </button>
                <button type="button" onClick={isListening ? handleStopVoiceInput : handleStartVoiceInput} className="secondary-button">
                  {isListening ? 'Stop microphone' : 'Start microphone'}
                </button>
                <button type="button" onClick={saveAnswer} disabled={loading} className="secondary-button">
                  Save answer
                </button>
                <button type="button" onClick={goNext} disabled={loading} className="frost-button">
                  {questionIndex < session.questions.length - 1 ? 'Submit and next' : 'Complete interview'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 p-8 text-sm text-slate-400">
              Press Start interview to generate your first 10-question mock interview.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-6">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Interview history</p>
            <div className="mt-4 space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-slate-400">No interviews yet.</p>
              ) : (
                history.map((item) => (
                  <button key={item.interview_id} type="button" onClick={() => viewReport(item.interview_id)} className="flex w-full items-center justify-between rounded-[1.3rem] border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200">
                    <span>{item.selected_role}</span>
                    <span>{item.status}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {report ? (
            <div className="glass-panel rounded-[2rem] p-6">
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Latest report</p>
              <div className="mt-4 space-y-4">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Overall score</p>
                  <p className="mt-2 text-3xl font-bold text-white">{report.overall_score}/100</p>
                  <p className="mt-2 text-sm text-slate-400">{report.summary}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatCard label="Technical" value={`${report.technical_score}/100`} />
                  <StatCard label="Problem solving" value={`${report.problem_solving_score}/100`} />
                  <StatCard label="Communication" value={`${report.communication_score}/100`} />
                  <StatCard label="Confidence" value={`${report.confidence_score}/100`} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Strengths</p>
                  <ul className="mt-2 space-y-1 pl-4 text-sm text-slate-200 list-disc">
                    {(report.strengths || []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Weak areas</p>
                  <ul className="mt-2 space-y-1 pl-4 text-sm text-slate-200 list-disc">
                    {(report.weaknesses || []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Roadmap</p>
                  <ul className="mt-2 space-y-2 pl-4 text-sm text-slate-200 list-disc">
                    {(report.roadmap || []).map((item) => <li key={item.week}>{item.week}: {item.focus}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
