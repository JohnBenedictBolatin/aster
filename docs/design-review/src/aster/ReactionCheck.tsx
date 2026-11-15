import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, X } from 'lucide-react';
import type { ReactionSession, ScenarioId } from './domain';
import { id } from './domain';
import { comparableReactionSessions, reactionMedian } from './reaction';
import { UrgentGuidance } from './UrgentGuidance';

type Result = Pick<ReactionSession, 'responsesMs' | 'missed' | 'premature' | 'interrupted' | 'input'>;

export function ReactionCheck({ scenarioId, previousSessions, urgentOpen, onUrgent, onCloseUrgent, onFinish, onClose }: {
  scenarioId: ScenarioId;
  previousSessions: ReactionSession[];
  urgentOpen: boolean;
  onUrgent: () => void;
  onCloseUrgent: () => void;
  onFinish: (session: ReactionSession) => void;
  onClose: () => void;
}) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [startedIso, setStartedIso] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [litAt, setLitAt] = useState<number | null>(null);
  const [responses, setResponses] = useState<number[]>([]);
  const [missed, setMissed] = useState(0);
  const [premature, setPremature] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState('');
  const [inputMethod, setInputMethod] = useState<ReactionSession['input']>('pointer');
  const trialTimeout = useRef<number | undefined>(undefined);
  const pulseTimeout = useRef<number | undefined>(undefined);
  const responsesRef = useRef(responses);
  const missedRef = useRef(missed);
  const prematureRef = useRef(premature);
  const startedRef = useRef(startedAt);
  const litAtRef = useRef(litAt);
  const inputMethodRef = useRef<ReactionSession['input'] | null>(null);
  const duration = 60_000;

  useEffect(() => { responsesRef.current = responses; }, [responses]);
  useEffect(() => { missedRef.current = missed; }, [missed]);
  useEffect(() => { prematureRef.current = premature; }, [premature]);
  useEffect(() => { startedRef.current = startedAt; }, [startedAt]);
  useEffect(() => { litAtRef.current = litAt; }, [litAt]);

  useEffect(() => {
    if (startedAt === null || result) return;
    const timer = window.setInterval(() => {
      const elapsedNow = Date.now() - startedAt;
      setElapsed(Math.min(elapsedNow, duration));
      if (elapsedNow >= duration) {
        window.clearInterval(timer);
        startedRef.current = null;
        if (trialTimeout.current) window.clearTimeout(trialTimeout.current);
        const completedAt = new Date().toISOString();
        setLitAt(null);
        setResult({ responsesMs: responsesRef.current, missed: missedRef.current, premature: prematureRef.current, interrupted: false, input: inputMethodRef.current ?? 'pointer' });
        onFinish({ id: id('REACTION'), scenarioId, version: 'aster-rst-demo-1', input: inputMethodRef.current ?? 'pointer', startedAt: startedIso,
          completedAt, durationMs: duration, responsesMs: responsesRef.current, missed: missedRef.current,
          premature: prematureRef.current, interrupted: false });
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [startedAt, result, onFinish, scenarioId, startedIso]);

  useEffect(() => {
    if (startedAt === null || result || litAt !== null) return;
    trialTimeout.current = window.setTimeout(() => {
      setLitAt(Date.now());
      trialTimeout.current = window.setTimeout(() => {
        setLitAt((current) => {
          if (current !== null) setMissed((count) => { missedRef.current = count + 1; return count + 1; });
          return null;
        });
      }, 1_500);
    }, 800 + ((responses.length * 317 + premature * 173) % 1_000));
    return () => { if (trialTimeout.current) window.clearTimeout(trialTimeout.current); };
  }, [startedAt, result, litAt, responses.length, premature]);

  useEffect(() => {
    const discardAttempt = () => {
      if (startedRef.current === null || result) return;
      startedRef.current = null;
      if (trialTimeout.current) window.clearTimeout(trialTimeout.current);
      if (pulseTimeout.current) window.clearTimeout(pulseTimeout.current);
      setLitAt(null);
      setMessage('The app lost focus. This attempt was discarded.');
      setStartedAt(null);
      setElapsed(0);
    };
    const stopIfHidden = () => { if (document.hidden) discardAttempt(); };
    document.addEventListener('visibilitychange', stopIfHidden);
    window.addEventListener('blur', discardAttempt);
    return () => {
      document.removeEventListener('visibilitychange', stopIfHidden);
      window.removeEventListener('blur', discardAttempt);
    };
  }, [result]);

  useEffect(() => {
    if (!urgentOpen || startedAt === null || result) return;
    startedRef.current = null;
    if (trialTimeout.current) window.clearTimeout(trialTimeout.current);
    setLitAt(null);
    setElapsed(0);
    setStartedAt(null);
    setMessage('The reaction check was discarded to show urgent guidance.');
  }, [urgentOpen, startedAt, result]);

  useEffect(() => () => {
    if (trialTimeout.current) window.clearTimeout(trialTimeout.current);
    if (pulseTimeout.current) window.clearTimeout(pulseTimeout.current);
  }, []);

  const start = () => {
    responsesRef.current = [];
    missedRef.current = 0;
    prematureRef.current = 0;
    setResponses([]);
    setMissed(0);
    setPremature(0);
    setResult(null);
    inputMethodRef.current = null;
    setInputMethod('pointer');
    setMessage('');
    setElapsed(0);
    setStartedIso(new Date().toISOString());
    const started = Date.now();
    startedRef.current = started;
    setStartedAt(started);
  };

  const respond = (event: MouseEvent<HTMLButtonElement>) => {
    if (startedAt === null || result) return;
    const detectedInput = event.detail === 0 ? 'keyboard' : 'pointer';
    if (inputMethodRef.current === null) inputMethodRef.current = detectedInput;
    else if (inputMethodRef.current !== detectedInput) inputMethodRef.current = 'mixed';
    setInputMethod(inputMethodRef.current);
    if (litAt !== null) {
      const response = Date.now() - litAt;
      setResponses((current) => [...current, response]);
      responsesRef.current = [...responsesRef.current, response];
      setLitAt(null);
    } else {
      setPremature((count) => count + 1);
      prematureRef.current += 1;
          setMessage('There was no signal yet. Wait for the white cue.');
    }
  };

  const sessionMedian = reactionMedian(result?.responsesMs ?? []);
  const compatiblePrevious = comparableReactionSessions(previousSessions, 'aster-rst-demo-1', inputMethod);
  const previousMedian = reactionMedian(compatiblePrevious.map((session) => reactionMedian(session.responsesMs)).filter((value): value is number => value !== null));

  return <section className="reaction-page" aria-labelledby="reaction-title">
    <button type="button" className="icon-button reaction-back" onClick={onClose} aria-label="Close reaction check"><ArrowLeft size={18} /></button>
    <button type="button" className="icon-button reaction-urgent" onClick={onUrgent} aria-label="Open urgent symptom guidance"><AlertTriangle size={17}/></button>
    <div className="reaction-content">
      <header><div className="aster-section-heading">PERFORMANCE CHECK</div><h1 id="reaction-title">Reaction time</h1>
        <p>Tap when the signal appears. Session length: 60 seconds.</p></header>
      {!result ? <div className={`reaction-panel ${litAt !== null ? 'is-lit' : ''}`}>
        <div className="reaction-cue" aria-live="polite">{litAt !== null ? <><span className="cue-dot" /><span>Respond</span></> : startedAt !== null ? <span>Wait for the signal</span> : <span>Ready to begin</span>}</div>
        <button type="button" className="reaction-target" onClick={respond} disabled={startedAt === null} aria-label={litAt !== null ? 'Respond to the white signal' : 'Wait for the white signal'}>
          {litAt !== null ? <span className="reaction-target-on" /> : <span className="reaction-target-off" />}
        </button>
        <div className="reaction-footer"><span>{startedAt === null ? '60 sec' : `${Math.ceil((duration - elapsed) / 1_000)} sec remaining`}</span>
          <span>{responses.length} responses · {missed} missed · {premature} early</span>
          <button type="button" className="text-button" onClick={() => { startedRef.current = null; if (trialTimeout.current) window.clearTimeout(trialTimeout.current); setStartedAt(null); setLitAt(null); setElapsed(0); setResponses([]); setMissed(0); setPremature(0); setMessage('This session was cancelled and won’t be saved.'); }}>{startedAt === null ? 'Exit' : 'Cancel'}</button>
        </div>
        {message && <p role="status" className="reaction-message">{message}</p>}
      </div> : <div className="reaction-result">
        <CheckCircle2 size={24} /><h2>Session recorded</h2>
        <p>{result.responsesMs.length} responses · {result.missed} missed signals · {result.premature} early taps · {result.input} input</p>
        {sessionMedian !== null && <p>Session median: {sessionMedian} ms</p>}
        {sessionMedian !== null && previousMedian !== null && <p>Median difference from {compatiblePrevious.length} compatible prior sessions: {sessionMedian - previousMedian > 0 ? '+' : ''}{sessionMedian - previousMedian} ms. This describes session variation only.</p>}
        <p>{compatiblePrevious.length} comparable sessions · same test version and input method. Session variation is not a fitness or readiness score.</p>
        <button type="button" className="primary-button" onClick={onClose}><X size={16} /> Close check</button>
      </div>}
      {startedAt === null && !result && <button type="button" className="primary-button reaction-start" onClick={start}>Start 60-second check</button>}
      <small className="reaction-source">NASA’s <a href="https://humanresearchroadmap.nasa.gov/Tasks/task.aspx?i=714" target="_blank" rel="noreferrer">ISS Reaction Self-Test research</a> informs this separately authored check.</small>
    </div>
    {urgentOpen && <UrgentGuidance onClose={onCloseUrgent} />}
  </section>;
}
