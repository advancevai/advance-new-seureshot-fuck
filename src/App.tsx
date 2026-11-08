/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';

export const APP_CONFIG = {
  name: '𝘼𝘿𝙑𝘼𝙉𝘾𝙀 𝙃𝘼𝘾𝙆',
  telegram: 'https://t.me/+WIKRSTgIhx5kNDRl',
  profileImage: 'https://kommodo.ai/i/fW98irLTwR6DTIIjqsTS',
  fullFrameImage: '/assets/profile.png',
};

declare global {
  interface Window {
    verifyKey?: () => void;
    unlock?: () => void;
    webkitAudioContext?: typeof AudioContext;
    APP_CONFIG?: typeof APP_CONFIG;
  }
}

// -------------------------------------------------------------
// PREDICTION ENSEMBLE ENGINE (WinGo 30S)
// -------------------------------------------------------------
const toBS = (e: number): 'B' | 'S' => (e >= 5 ? 'B' : 'S');
const clamp = (e: number, t: number, n: number) => Math.max(t, Math.min(n, e));
const flip = (e: 'B' | 'S'): 'B' | 'S' => (e === 'B' ? 'S' : 'B');

interface ExpertVote {
  name: string;
  dir: 'B' | 'S';
  strength: number;
}

function ie(e: ('B' | 'S')[]): ExpertVote | null {
  if (e.length < 3) return null;
  const t = e[0];
  let n = 0;
  for (const r of e) {
    if (r === t) n++;
    else break;
  }
  return n < 2
    ? null
    : n <= 3
    ? { name: 'STREAK-RIDE', dir: t, strength: 0.35 + n * 0.1 }
    : { name: 'STREAK-BREAK', dir: flip(t), strength: clamp(0.4 + (n - 3) * 0.15, 0, 0.95) };
}

function ae(e: ('B' | 'S')[]): ExpertVote | null {
  if (e.length < 4) return null;
  let t = 0;
  for (let n = 1; n < Math.min(e.length, 8) && e[n] !== e[n - 1]; n++) t++;
  return t < 3 ? null : { name: 'ALTERNATE', dir: flip(e[0]), strength: clamp(0.3 + t * 0.12, 0, 0.95) };
}

function q(e: ('B' | 'S')[], t: number): ExpertVote | null {
  if (e.length < t + 6) return null;
  const n = [...e].reverse().join('');
  const r = n.slice(-t);
  let i = 0, a = 0;
  for (let idx = 0; idx + t < n.length; idx++) {
    if (n.slice(idx, idx + t) === r) {
      if (n[idx + t] === 'B') i++;
      else a++;
    }
  }
  const o = i + a;
  if (o < 3) return null;
  const s = i === a ? e[0] : i > a ? 'B' : 'S';
  const c = Math.abs(i - a) / o;
  return c < 0.12 ? null : { name: 'MARKOV-' + t, dir: s, strength: clamp(c * (1 - 1 / (1 + o / 6)), 0, 0.95) };
}

function oe(e: ('B' | 'S')[]): ExpertVote | null {
  const t = e.slice(0, 16);
  if (t.length < 8) return null;
  const n = (t.filter((x) => x === 'B').length - t.length / 2) / (t.length / 2);
  return Math.abs(n) < 0.25 ? null : { name: 'BALANCE', dir: n > 0 ? 'S' : 'B', strength: clamp(Math.abs(n), 0, 0.9) };
}

function se(e: ('B' | 'S')[]): ExpertVote | null {
  const t = e.slice(0, 6);
  if (t.length < 4) return null;
  let n = 0;
  t.forEach((x, idx) => (n += (x === 'B' ? 1 : -1) * (6 - idx)));
  return Math.abs(n) < 6 ? null : { name: 'MOMENTUM', dir: n > 0 ? 'B' : 'S', strength: clamp(Math.abs(n) / 21, 0, 0.9) };
}

function ce(e: ('B' | 'S')[]): ExpertVote | null {
  if (e.length < 10) return null;
  const t = e.slice(0, 3).join('');
  let n = 0, r = 0;
  for (let i = 1; i + 3 < e.length; i++) {
    if (e.slice(i, i + 3).join('') === t) {
      if (e[i - 1] === 'B') n++;
      else r++;
    }
  }
  const i = n + r;
  return i < 2 || n === r ? null : { name: 'MIRROR', dir: n > r ? 'B' : 'S', strength: clamp((Math.abs(n - r) / i) * 0.8, 0, 0.9) };
}

function le(e: number[]): ExpertVote | null {
  const t = e.slice(0, 8);
  if (t.length < 6) return null;
  const n = t.slice(0, 3).reduce((a, b) => a + b, 0) / 3 - t.slice(3).reduce((a, b) => a + b, 0) / (t.length - 3);
  return Math.abs(n) < 1.2 ? null : { name: 'DRIFT-FADE', dir: n > 0 ? 'S' : 'B', strength: clamp(Math.abs(n) / 5, 0, 0.85) };
}

function ue(nums: number[]): ExpertVote[] {
  const t = nums.map(toBS);
  const n: ExpertVote[] = [];
  const r = (x: ExpertVote | null) => x && n.push(x);
  r(ie(t));
  r(ae(t));
  r(q(t, 1));
  r(q(t, 2));
  r(q(t, 3));
  r(oe(t));
  r(se(t));
  r(ce(t));
  r(le(nums));
  return n;
}

function de(nums: number[], weights: Record<string, number>) {
  const n = ue(nums);
  if (!n.length) return null;
  let r = 0, i = 0;
  for (const x of n) {
    const w = weights[x.name] ?? 1;
    if (x.dir === 'B') r += x.strength * w;
    else i += x.strength * w;
  }
  const a = r + i;
  if (a <= 0) return null;
  const o: 'B' | 'S' = r >= i ? 'B' : 'S';
  const s = Math.abs(r - i) / a;
  const c = n.filter((x) => x.dir === o);
  const l = [...c].sort((a, b) => b.strength * (weights[b.name] ?? 1) - a.strength * (weights[a.name] ?? 1))[0];
  return {
    direction: o,
    confidence: clamp(45 + s * 55, 0, 99),
    votes: n,
    topExpert: l?.name ?? 'ENSEMBLE',
    agreement: (c.length / n.length) * 100,
  };
}

function fe(weights: Record<string, number>, votes: ExpertVote[], actualBS: 'B' | 'S') {
  const r = { ...weights };
  for (const x of votes) {
    const cur = r[x.name] ?? 1;
    const i = (x.dir === actualBS ? 0.08 : -0.1) * (0.4 + x.strength);
    r[x.name] = clamp(cur * (1 + i), 0.15, 3);
  }
  return r;
}

function pe(nums: number[], dir: 'B' | 'S') {
  const n = dir === 'B' ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];
  if (!nums.length) return { numbers: n.slice(0, 2), confidence: 0 };
  const r = nums.slice(0, 40);
  const i = nums[0];
  const a = new Map<number, number>();
  for (const cand of n) {
    let gap = r.indexOf(cand);
    if (gap === -1) gap = r.length;
    const o = clamp(gap / 12, 0, 1.6);
    let s = 0;
    r.forEach((val, idx) => {
      if (val === cand) s += (40 - idx) / 40;
    });
    s = clamp(s / 4, 0, 1.2);
    let c = 0, l = 0;
    for (let idx = 1; idx < nums.length; idx++) {
      if (nums[idx] === i) {
        l++;
        if (nums[idx - 1] === cand) c++;
      }
    }
    const u = l >= 3 ? (c / l) * 1.5 : 0;
    a.set(cand, o * 1.1 + s * 0.8 + u);
  }
  const o = [...a.entries()].sort((a, b) => b[1] - a[1]);
  const s = o.slice(0, 2).map(([x]) => x);
  const c = o.reduce((acc, [, v]) => acc + v, 0);
  const l = o.slice(0, 2).reduce((acc, [, v]) => acc + v, 0);
  return { numbers: s, confidence: c > 0 ? (l / c) * 100 : 0 };
}

// Deterministic clock-based round generator fallback (17-digit WinGo format)
function getClockRounds(mode = '30s', count = 20) {
  const intervalSec = mode === '30s' ? 30 : 60;
  const nowSec = Math.floor(Date.now() / 1000);
  const d = new Date(nowSec * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const datePrefix = '' + yyyy + mm + dd;
  const secondsSinceUtcMidnight = d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
  const currentDailySlot = Math.floor(secondsSinceUtcMidnight / intervalSec) + 1;
  const gameTag = mode === '30s' ? '10005' : '10001';
  const out: { period: string; number: number }[] = [];
  for (let i = 1; i <= count; i++) {
    const slot = Math.max(1, currentDailySlot - i);
    const period = datePrefix + gameTag + String(slot).padStart(4, '0');
    let h = 2166136261;
    const str = mode + ':' + period;
    for (let k = 0; k < str.length; k++) {
      h ^= str.charCodeAt(k);
      h = Math.imul(h, 16777619);
    }
    const number = Math.abs(h) % 10;
    out.push({ period, number });
  }
  return out;
}

// -------------------------------------------------------------
// PASSGATE ACCESS VERIFICATION
// -------------------------------------------------------------
const PG_URL = 'https://advance-admin.lovable.app';
const PG_KEY = 'pgk_live_qMS4Y8HdnyYvayl0CNPgu63dabpdipWH';

async function callPassGate(path: string, body: Record<string, any>) {
  const res = await fetch(PG_URL + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': PG_KEY,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// -------------------------------------------------------------
// AUDIO & VIBRATION UTILS
// -------------------------------------------------------------
let audioCtx: AudioContext | null = null;
function playBeep(enabled = false) {
  if (!enabled) return;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!audioCtx) audioCtx = new AudioCtor();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    [0, 0.22].forEach((off) => {
      if (!audioCtx) return;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t + off);
      g.gain.exponentialRampToValueAtTime(0.25, t + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.16);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t + off);
      o.stop(t + off + 0.2);
    });
  } catch {}
}

function triggerVibration() {
  if (navigator.vibrate) {
    try {
      navigator.vibrate([200, 100, 200, 100, 300]);
    } catch {}
  }
}

// -------------------------------------------------------------
// MAIN REACT COMPONENT
// -------------------------------------------------------------
export default function App() {
  // Authentication & Session
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showFullFrameModal, setShowFullFrameModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginMsg, setLoginMsg] = useState<{ text: string; isError: boolean }>({
    text: 'লগইন করতে আপনার ACCESS KEY দিন',
    isError: false,
  });
  const [isLoginBusy, setIsLoginBusy] = useState(false);
  const [loginUnlockedVisual, setLoginUnlockedVisual] = useState(false);
  const [loginScreenGone, setLoginScreenGone] = useState(false);
  const [keyBoxShake, setKeyBoxShake] = useState(false);
  const [loginFlashGo, setLoginFlashGo] = useState(false);

  // Sound Mute State (Off by default)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('sound_enabled') === 'true';
  });

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('sound_enabled', String(next));
      if (next) playBeep(true);
      return next;
    });
  };

  // Bot State
  const [rounds, setRounds] = useState<{ period: string; number: number }[]>(() => getClockRounds('30s', 20));
  const [history, setHistory] = useState<
    { period: string; pred: 'B' | 'S'; predNums: number[]; actual: number; outcome: string }[]
  >([]);
  const [stats, setStats] = useState({ win: 0, loss: 0, jackpot: 0 });
  const [lossStreak, setLossStreak] = useState(0);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<{
    period: string;
    bs: 'B' | 'S';
    nums: number[];
    votes: ExpertVote[];
  } | null>(null);

  // UI Phase
  const [phase, setPhase] = useState<'idle' | 'scan' | 'res'>('idle');
  const [scanStep, setScanStep] = useState('CONNECTING TO SERVER');
  const [scanPct, setScanPct] = useState(0);
  const [scanDigit, setScanDigit] = useState<string | number>(0);
  const [hexStream, setHexStream] = useState('0x00A1F3');

  // Result UI Display
  const [resultPeriod, setResultPeriod] = useState('—');
  const [resultBS, setResultBS] = useState<'BIG' | 'SMALL'>('BIG');
  const [resultShield, setResultShield] = useState(false);
  const [resultConfidence, setResultConfidence] = useState(0);
  const [resultPattern, setResultPattern] = useState('—');
  const [resultFlashGo, setResultFlashGo] = useState(false);
  const [meterWidth, setMeterWidth] = useState(0);

  // Toast
  const [toastText, setToastText] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Countdown Timer
  const [timerNum, setTimerNum] = useState('00:30');
  const [timerDashOffset, setTimerDashOffset] = useState(0);
  const [isTimerHot, setIsTimerHot] = useState(false);

  // Tracking refs
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boltsRef = useRef<SVGGElement>(null);
  const scanRAFRef = useRef<number>(0);
  const lastPeriodRef = useRef<string | null>(null);
  const shownPeriodRef = useRef<string | null>(null);
  const isShownRef = useRef(false);
  const engineTimer = useRef<any>(null);

  // Helper for formatted period number
  const nextPeriod = () => (rounds[0] ? String(BigInt(rounds[0].period) + 1n) : '—');

  // -------------------------------------------------------------
  // PREDICTION PROCESSING
  // -------------------------------------------------------------
  const computePrediction = useCallback(() => {
    if (rounds.length < 3) return null;
    const nums = rounds.map((e) => e.number);
    const t = de(nums, weights);
    const n = toBS(nums[0] ?? 5);
    const r = t?.direction ?? n;
    const votes = t?.votes ?? [];
    const safe = lossStreak >= 2;
    const dir = safe ? (r === 'B' ? 'S' : 'B') : r;
    const jp = pe(nums, dir);
    const conf = t ? t.confidence : 50;
    return {
      direction: dir,
      votes,
      safe,
      numbers: jp.numbers,
      confidence: conf * 0.6 + jp.confidence * 0.4,
      patternName: t?.topExpert ?? 'TREND FOLLOW',
      matchType: t ? Math.round(t.agreement) + '% AGREE' : 'INSTANT',
      reading: conf >= 75 ? 'STRONG' : conf >= 60 ? 'MODERATE' : 'SCALP',
    };
  }, [rounds, weights, lossStreak]);

  const showResult = useCallback(() => {
    const F = computePrediction();
    const period = nextPeriod();
    if (!F || !F.direction) {
      setPhase('idle');
      return;
    }
    const isBig = F.direction === 'B';
    setResultBS(isBig ? 'BIG' : 'SMALL');
    setResultPeriod(period);
    setResultShield(!!F.safe);
    setResultConfidence(F.confidence);
    setResultPattern(F.patternName + ' · ' + F.reading);
    setPhase('res');

    // Trigger flash animation
    setResultFlashGo(false);
    requestAnimationFrame(() => {
      setResultFlashGo(true);
      setMeterWidth(Math.min(99, F.confidence));
    });

    isShownRef.current = true;
    shownPeriodRef.current = period;
  }, [computePrediction]);

  const startScan = useCallback(() => {
    setPhase('scan');
    const STEPS = [
      'CONNECTING 30S SERVER',
      'FETCHING LIVE RESULTS',
      'READING LAST 20 ROUNDS',
      'MATCHING PATTERNS',
      'AI ENSEMBLE VOTING',
      'LOCKING PREDICTION',
    ];
    const dur = 3600;
    const t0 = performance.now();
    let lastTick = 0;
    cancelAnimationFrame(scanRAFRef.current);

    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const pct = Math.floor((1 - Math.pow(1 - k, 1.6)) * 100);
      setScanPct(pct);
      setScanStep('> ' + STEPS[Math.min(STEPS.length - 1, Math.floor(k * STEPS.length))]);
      if (now - lastTick > 70) {
        lastTick = now;
        setScanDigit(Math.random() < 0.25 ? (Math.random() < 0.5 ? 'B' : 'S') : Math.floor(Math.random() * 10));
        setHexStream('0x' + Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, '0'));
      }
      if (k < 1) {
        scanRAFRef.current = requestAnimationFrame(tick);
      } else {
        showResult();
      }
    };
    scanRAFRef.current = requestAnimationFrame(tick);
  }, [showResult]);

  const triggerToast = useCallback((outcome: string) => {
    if (outcome === 'LOSS') return; // loss is never shown, as per original spec
    setToastText('WIN ✓');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2600);
  }, []);

  const processIncomingRounds = useCallback(
    (newRounds: { period: string; number: number }[]) => {
      if (!newRounds || !newRounds.length) return;
      setRounds(newRounds);
      const latest = newRounds[0];
      let newPeriod = false;
      let outcome: string | null = null;

      if (lastPeriodRef.current !== latest.period) {
        newPeriod = lastPeriodRef.current !== null;
        lastPeriodRef.current = latest.period;
        if (pending && pending.period === latest.period) {
          const actualBS = toBS(latest.number);
          outcome = pending.bs === actualBS ? 'WIN' : 'LOSS';
          if (pending.nums.includes(latest.number)) outcome = 'JACKPOT';

          setWeights((prev) => fe(prev, pending.votes, actualBS));
          setLossStreak((prev) => (outcome === 'LOSS' ? prev + 1 : 0));
          setStats((prev) => ({
            win: prev.win + (outcome === 'WIN' ? 1 : 0),
            loss: prev.loss + (outcome === 'LOSS' ? 1 : 0),
            jackpot: prev.jackpot + (outcome === 'JACKPOT' ? 1 : 0),
          }));
          setHistory((prev) => [
            { period: latest.period, pred: pending.bs, predNums: pending.nums, actual: latest.number, outcome: outcome! },
            ...prev,
          ].slice(0, 20));
          setPending(null);
        }
      }

      const F = computePrediction();
      const nxt = newRounds[0] ? String(BigInt(newRounds[0].period) + 1n) : '—';
      if (F?.direction && newRounds[0]) {
        setPending({ period: nxt, bs: F.direction, nums: F.numbers, votes: F.votes });
      }

      if (outcome && isShownRef.current) triggerToast(outcome);
      if (newPeriod && isShownRef.current && phase !== 'scan' && shownPeriodRef.current !== nxt) {
        startScan();
      }
    },
    [pending, computePrediction, phase, startScan, triggerToast]
  );

  const fetchLiveRounds = useCallback(async () => {
    const code = 'WinGo_30S';
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: '30s', key: 'UNLOCKED' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.rounds?.length) {
          processIncomingRounds(data.rounds);
          return;
        }
      }
    } catch {}

    const urls = [
      'https://draw.ar-lottery01.com/WinGo/' + code + '/GetHistoryIssuePage.json?pageNo=1&pageSize=20',
      'https://maanwin.club9.eu.cc/WinGo/' + code + '/GetHistoryIssuePage.json?pageNo=1&pageSize=20',
    ];
    for (const u of urls) {
      try {
        const res = await fetch(u);
        if (res.ok) {
          const j = await res.json();
          const list = j?.data?.list;
          if (Array.isArray(list) && list.length > 0) {
            const mapped = list.map((x: any) => ({
              period: String(x.issueNumber || x.period),
              number: Number(x.number ?? x.premium ?? 0),
            }));
            processIncomingRounds(mapped);
            return;
          }
        }
      } catch {}
    }
    processIncomingRounds(getClockRounds('30s', 20));
  }, [processIncomingRounds]);

  const startEngine = useCallback(() => {
    if (engineTimer.current) clearInterval(engineTimer.current);
    fetchLiveRounds();
    engineTimer.current = setInterval(fetchLiveRounds, 2000);
  }, [fetchLiveRounds]);

  const onLoginSuccess = useCallback(() => {
    setIsLoggedIn(true);
    setLoginMsg({ text: '', isError: false });

    setLoginUnlockedVisual(true);
    setLoginFlashGo(true);
    setTimeout(() => {
      setLoginScreenGone(true);
    }, 650);

    triggerVibration();
    playBeep(soundEnabled);
    startEngine();
  }, [startEngine, soundEnabled]);

  const redirectToTelegram = () => {
    try {
      const a = document.createElement('a');
      a.href = APP_CONFIG.telegram;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.location.href = APP_CONFIG.telegram;
    }
  };

  // -------------------------------------------------------------
  // PASSGATE UNLOCK FUNCTION
  // -------------------------------------------------------------
  const unlock = async () => {
    // Hack logine howar age telegram e niye jabe
    redirectToTelegram();

    const pw = passwordInput.trim();
    if (!pw) {
      setLoginMsg({ text: 'টেলিগ্রাম থেকে ACCESS KEY নিয়ে আসুন', isError: true });
      setKeyBoxShake(true);
      setTimeout(() => setKeyBoxShake(false), 1600);
      return;
    }

    setLoginMsg({ text: 'যাচাই হচ্ছে… (Checking Key)', isError: false });
    setIsLoginBusy(true);

    try {
      const res = await callPassGate('/api/public/v1/verify', { password: pw });
      if (res.valid) {
        // Redirect to Telegram right before unlocking hack
        redirectToTelegram();
        localStorage.setItem('pg_token', res.token);
        setLoginMsg({ text: 'সফলভাবে লগইন হয়েছে!', isError: false });
        onLoginSuccess();
        setPasswordInput('');
      } else if (res.reason === 'rate_limited') {
        setLoginMsg({ text: 'Too many attempts. Try later.', isError: true });
        setKeyBoxShake(true);
        setTimeout(() => setKeyBoxShake(false), 1600);
      } else if (res.reason === 'ip_blocked') {
        setLoginMsg({ text: 'Access from your network is blocked.', isError: true });
        setKeyBoxShake(true);
        setTimeout(() => setKeyBoxShake(false), 1600);
      } else if (res.reason === 'origin_not_allowed') {
        setLoginMsg({ text: 'This site is not allowed for this key.', isError: true });
        setKeyBoxShake(true);
        setTimeout(() => setKeyBoxShake(false), 1600);
      } else if (res.reason === 'invalid_api_key') {
        setLoginMsg({ text: 'API key is wrong or revoked.', isError: true });
        setKeyBoxShake(true);
        setTimeout(() => setKeyBoxShake(false), 1600);
      } else {
        setLoginMsg({ text: 'ভুল কী! টেলিগ্রাম থেকে সঠিক কী নিন', isError: true });
        setKeyBoxShake(true);
        setTimeout(() => setKeyBoxShake(false), 1600);
      }
    } catch {
      setLoginMsg({ text: 'সার্ভারে সংযোগ হচ্ছে না। টেলিগ্রাম চেক করুন।', isError: true });
      setKeyBoxShake(true);
      setTimeout(() => setKeyBoxShake(false), 1600);
    } finally {
      setIsLoginBusy(false);
    }
  };

  // Expose verifyKey and unlock on window for script compatibility
  useEffect(() => {
    window.verifyKey = unlock;
    window.unlock = unlock;
    window.APP_CONFIG = APP_CONFIG;
  });

  // Check saved PassGate session on mount
  useEffect(() => {
    const t = localStorage.getItem('pg_token');
    if (t) {
      callPassGate('/api/public/v1/session', { token: t })
        .then((res) => {
          if (res.valid) {
            onLoginSuccess();
          } else {
            localStorage.removeItem('pg_token');
          }
        })
        .catch(() => {});
    }
  }, [onLoginSuccess]);

  // -------------------------------------------------------------
  // COUNTDOWN TIMER (30S CYCLE)
  // -------------------------------------------------------------
  useEffect(() => {
    const tick = () => {
      const sec = Math.floor(Date.now() / 1000);
      const rem = 30 - (sec % 30);
      const displayRem = rem === 30 ? 30 : rem;
      setTimerNum('00:' + String(displayRem).padStart(2, '0'));
      setTimerDashOffset(Number((263.9 * (1 - rem / 30)).toFixed(1)));
      setIsTimerHot(rem <= 5);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, []);

  // -------------------------------------------------------------
  // 3D PERSPECTIVE TILT
  // -------------------------------------------------------------
  useEffect(() => {
    const frame = frameRef.current;
    const stage = stageRef.current;
    if (!frame || !stage) return;

    const setTilt = (x: number, y: number) => {
      stage.style.setProperty('--ry', (x * 5).toFixed(2) + 'deg');
      stage.style.setProperty('--rx', (-y * 4).toFixed(2) + 'deg');
    };

    const handlePointerMove = (e: PointerEvent) => {
      const r = frame.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      setTilt(x, y);
    };

    const handlePointerLeave = () => setTilt(0, 0);

    window.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  // -------------------------------------------------------------
  // CANVAS PARTICLES EFFECT
  // -------------------------------------------------------------
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    const P: any[] = [];

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = c.clientWidth;
      H = c.clientHeight;
      c.width = W * dpr;
      c.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (p: any, init = false) => {
      p.x = Math.random() * W;
      p.y = init ? Math.random() * H : H + 10;
      p.r = 0.6 + Math.random() * 2.2;
      p.vy = -(0.25 + Math.random() * 0.9);
      p.vx = (Math.random() - 0.5) * 0.3;
      p.life = 0;
      p.max = 200 + Math.random() * 300;
      p.col = Math.random() < 0.78 ? '61,255,60' : '255,215,40';
      p.ph = Math.random() * 6.28;
      return p;
    };

    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 70; i++) P.push(spawn({}, true));

    let animId = 0;
    const render = () => {
      ctx.clearRect(0, 0, W, H);
      const boost = phase === 'scan' ? 2.2 : 1;
      ctx.globalCompositeOperation = 'lighter';
      for (const p of P) {
        p.life += boost;
        p.ph += 0.05;
        p.x += p.vx + Math.sin(p.ph) * 0.3;
        p.y += p.vy * boost;
        if (p.y < -10 || p.life > p.max) spawn(p, false);
        const a = Math.sin(Math.min(1, p.life / p.max) * Math.PI);
        ctx.fillStyle = `rgba(${p.col},${(a * 0.18).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = `rgba(${p.col},${(a * 0.95).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fill();
      }
      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [phase]);

  // -------------------------------------------------------------
  // ELECTRIC BOLTS ANIMATION
  // -------------------------------------------------------------
  useEffect(() => {
    const g = boltsRef.current;
    if (!g) return;
    const NS = 'http://www.w3.org/2000/svg';
    let timeoutId: any = 0;

    function bolt(x1: number, y1: number, x2: number, y2: number, n: number, jit: number) {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const j = i === 0 || i === n ? 0 : (Math.random() - 0.5) * jit;
        pts.push((x1 + (x2 - x1) * t + j).toFixed(1) + ',' + (y1 + (y2 - y1) * t + (Math.random() - 0.5) * 6).toFixed(1));
      }
      return pts.join(' ');
    }

    const sides = [
      [[52, 1436, 14, 1368], [52, 1436, 8, 1508], [60, 1396, 20, 1436]],
      [[976, 1436, 1014, 1368], [976, 1436, 1018, 1506], [964, 1476, 1006, 1436]],
    ];

    function draw() {
      if (!g) return;
      g.innerHTML = '';
      sides.forEach((side) =>
        side.forEach(([a, b, c, d]) => {
          if (Math.random() < 0.45) return;
          const p = document.createElementNS(NS, 'polyline');
          p.setAttribute('points', bolt(a, b, c, d, 7, 26));
          p.setAttribute('stroke', Math.random() < 0.7 ? '#fff59a' : '#9dff6a');
          p.setAttribute('stroke-width', (1.5 + Math.random() * 2.5).toFixed(1));
          p.setAttribute('opacity', (0.5 + Math.random() * 0.5).toFixed(2));
          g.appendChild(p);
        })
      );
      timeoutId = setTimeout(draw, (phase === 'scan' ? 50 : 90) + Math.random() * 140);
    }
    draw();

    return () => clearTimeout(timeoutId);
  }, [phase]);

  // Handle Generate Prediction button click
  const handleGenClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isLoggedIn) return;
    const r = e.currentTarget.getBoundingClientRect();
    const sp = document.createElement('span');
    sp.className = 'ripple';
    const size = r.width * 0.9;
    sp.style.width = sp.style.height = size + 'px';
    sp.style.left = (e.clientX ? e.clientX - r.left : r.width / 2) + 'px';
    sp.style.top = (e.clientY ? e.clientY - r.top : r.height / 2) + 'px';
    e.currentTarget.appendChild(sp);
    setTimeout(() => sp.remove(), 800);
    startScan();
  };

  // Render Period Tail Formatting
  const currentNextPeriod = nextPeriod();
  const periodPrefix = currentNextPeriod.slice(0, -4);
  const periodTail = currentNextPeriod.slice(-4);

  return (
    <>
      <div className="backdrop"></div>
      <div className="frame" ref={frameRef}>
        <div
          className={`stage float ${phase === 'scan' ? 'scanning' : ''}`}
          id="stage"
          ref={stageRef}
        >
          {/* Secret stage container reference for PassGate */}
          <div id="pg-secret" style={{ display: 'contents' }}>
            {/* Top Brand Bar */}
            <div className="topBrandBar">
              <div
                className="brandBadge"
                onClick={() => setShowFullFrameModal(true)}
                title="Click to view PNG Full Frame"
              >
                <img
                  src="/assets/profile.png"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = APP_CONFIG.profileImage;
                  }}
                  alt={APP_CONFIG.name}
                />
                <div>
                  <div className="bName">{APP_CONFIG.name}</div>
                  <div className="bTag">CYBER HACK · FULL FRAME</div>
                </div>
              </div>
              <div className="topActions">
                <button
                  className={`soundToggleBtn ${soundEnabled ? 'active' : ''}`}
                  type="button"
                  onClick={toggleSound}
                  title={soundEnabled ? 'সাউন্ড চালু আছে (বন্ধ করতে ক্লিক করুন)' : 'সাউন্ড বন্ধ আছে (চালু করতে ক্লিক করুন)'}
                  aria-label="Sound Toggle"
                >
                  {soundEnabled ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  )}
                  <span>{soundEnabled ? 'SOUND ON' : 'SOUND OFF'}</span>
                </button>
                <button
                  className="fullFrameBtn"
                  type="button"
                  onClick={() => setShowFullFrameModal(true)}
                  title="View full-resolution PNG"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                  <span>FULL FRAME</span>
                </button>
                <a
                  href={APP_CONFIG.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="topTgLink"
                  aria-label="Telegram Channel"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                  <span>TELEGRAM</span>
                </a>
              </div>
            </div>

            {/* Emissive pulse layers */}
            <div className="layer glowG"></div>
            <div className="layer glowY"></div>
            <div className="titleShine"></div>

            {/* Vector FX SVG */}
            <svg className="fx" viewBox="0 0 1024 1672" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="gl" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3.5" result="b"></feGaussianBlur>
                  <feMerge>
                    <feMergeNode in="b"></feMergeNode>
                    <feMergeNode in="b"></feMergeNode>
                    <feMergeNode in="SourceGraphic"></feMergeNode>
                  </feMerge>
                </filter>
                <filter id="gl2" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8"></feGaussianBlur>
                </filter>
                <radialGradient id="eye">
                  <stop offset="0" stopColor="#eaffd8"></stop>
                  <stop offset=".25" stopColor="#5dff3c" stopOpacity=".9"></stop>
                  <stop offset="1" stopColor="#1aff2a" stopOpacity="0"></stop>
                </radialGradient>
                <radialGradient id="spk">
                  <stop offset="0" stopColor="#fff"></stop>
                  <stop offset=".3" stopColor="#fff59a"></stop>
                  <stop offset="1" stopColor="#ffd21f" stopOpacity="0"></stop>
                </radialGradient>
                <linearGradient id="beam" x1="0" x2="1">
                  <stop offset="0" stopColor="#3dff3c" stopOpacity="0"></stop>
                  <stop offset=".5" stopColor="#ffffff"></stop>
                  <stop offset="1" stopColor="#3dff3c" stopOpacity="0"></stop>
                </linearGradient>
                <linearGradient id="beamY" x1="0" x2="1">
                  <stop offset="0" stopColor="#ffd21f" stopOpacity="0"></stop>
                  <stop offset=".5" stopColor="#fffbe0"></stop>
                  <stop offset="1" stopColor="#ffd21f" stopOpacity="0"></stop>
                </linearGradient>
                <symbol id="star" viewBox="-10 -10 20 20">
                  <path d="M0-10 1.6-1.6 10 0 1.6 1.6 0 10-1.6 1.6-10 0-1.6-1.6z" fill="#fff"></path>
                </symbol>
              </defs>

              {/* Orbit energy ring around hero */}
              <g transform="rotate(-16 520 230)">
                <ellipse className="orbit o1" cx="520" cy="230" rx="320" ry="92" pathLength="1000"></ellipse>
                <ellipse className="orbit o2" cx="520" cy="230" rx="320" ry="92" pathLength="1000"></ellipse>
              </g>

              {/* Eyes */}
              <g className="eyes">
                <circle cx="457" cy="220" r="46" fill="url(#eye)"></circle>
                <circle cx="532" cy="220" r="46" fill="url(#eye)"></circle>
              </g>

              {/* Sparkles */}
              <g className="sparks">
                <use href="#star" x="487" y="0" width="28" height="28" style={{ ['--d' as any]: '0s' }}></use>
                <use href="#star" x="380" y="40" width="22" height="22" style={{ ['--d' as any]: '.6s' }}></use>
                <use href="#star" x="580" y="20" width="22" height="22" style={{ ['--d' as any]: '1.3s' }}></use>
                <use href="#star" x="718" y="250" width="26" height="26" style={{ ['--d' as any]: '.9s' }}></use>
                <use href="#star" x="770" y="285" width="18" height="18" style={{ ['--d' as any]: '2.1s' }}></use>
                <use href="#star" x="195" y="160" width="20" height="20" style={{ ['--d' as any]: '1.7s' }}></use>
                <use href="#star" x="760" y="190" width="18" height="18" style={{ ['--d' as any]: '2.6s' }}></use>
                <use href="#star" x="935" y="375" width="22" height="22" style={{ ['--d' as any]: '.3s' }}></use>
                <use href="#star" x="760" y="365" width="34" height="34" style={{ ['--d' as any]: '1.1s' }}></use>
                <use href="#star" x="210" y="490" width="26" height="26" style={{ ['--d' as any]: '2.4s' }}></use>
              </g>

              {/* Subtitle band light */}
              <rect
                className="sweepY"
                x="0"
                y="618"
                width="160"
                height="44"
                fill="url(#beamY)"
                opacity=".55"
                style={{ ['--from' as any]: '215px', ['--to' as any]: '660px' }}
              ></rect>

              {/* Header bar lights */}
              <rect
                className="sweep"
                x="0"
                y="706"
                width="170"
                height="6"
                fill="url(#beam)"
                filter="url(#gl)"
                style={{ ['--from' as any]: '150px', ['--to' as any]: '700px' }}
              ></rect>
              <rect
                className="sweep"
                x="0"
                y="832"
                width="170"
                height="5"
                fill="url(#beam)"
                filter="url(#gl)"
                style={{ ['--from' as any]: '700px', ['--to' as any]: '150px', animationDelay: '-1.3s' }}
              ></rect>

              <g className="target" transform="translate(225 775)">
                <circle
                  className="tRing"
                  r="42"
                  fill="none"
                  stroke="#3dff3c"
                  strokeWidth="3"
                  strokeDasharray="14 10"
                  filter="url(#gl)"
                ></circle>
                <circle className="tPing" r="30" fill="none" stroke="#9dff8a" strokeWidth="2"></circle>
                <circle r="7" fill="#d9ffcc" className="tDot" filter="url(#gl)" strokeWidth="0"></circle>
              </g>

              {/* Result frame running lights */}
              <path
                className="run r1"
                d="M100 858 L925 858 L968 898 L968 1135 L920 1172 L105 1172 L60 1135 L60 898 Z"
                pathLength="1000"
              ></path>
              <path
                className="run r2"
                d="M100 858 L925 858 L968 898 L968 1135 L920 1172 L105 1172 L60 1135 L60 898 Z"
                pathLength="1000"
              ></path>
              <rect
                className="sweep"
                x="0"
                y="876"
                width="120"
                height="5"
                fill="url(#beam)"
                filter="url(#gl)"
                style={{ ['--from' as any]: '330px', ['--to' as any]: '580px', animationDuration: '1.8s' }}
              ></rect>

              {/* Portal ripples */}
              <g className="portal">
                <ellipse cx="512" cy="1146" rx="400" ry="42" style={{ ['--d' as any]: '0s' }}></ellipse>
                <ellipse cx="512" cy="1146" rx="400" ry="42" style={{ ['--d' as any]: '.8s' }}></ellipse>
                <ellipse cx="512" cy="1146" rx="400" ry="42" style={{ ['--d' as any]: '1.6s' }}></ellipse>
                <ellipse cx="512" cy="1146" rx="60" ry="10" className="core" filter="url(#gl2)"></ellipse>
              </g>

              {/* Button lightning flicker & chevrons */}
              <path
                className="boltIcon"
                d="M190 1398 L158 1442 L182 1442 L168 1474 L208 1426 L184 1426 L200 1398 Z"
                fill="#fff6a0"
                filter="url(#gl)"
              ></path>
              <g className="chev" fill="none" stroke="#9dff6a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" filter="url(#gl)">
                <polyline points="864,1418 882,1434 864,1450" style={{ ['--d' as any]: '0s' }}></polyline>
                <polyline points="890,1418 908,1434 890,1450" style={{ ['--d' as any]: '.18s' }}></polyline>
              </g>

              {/* Dynamic electric bolts at button sides */}
              <g id="bolts" ref={boltsRef} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#gl)"></g>
            </svg>

            {/* Ember particles canvas */}
            <canvas className="particles" id="pc" ref={canvasRef} width="640" height="1046"></canvas>

            {/* Result Content */}
            <div className={`content ${phase === 'scan' ? 'scanning' : ''}`} id="content">
              <div className="hexbg"></div>

              {/* IDLE STATE */}
              <div className={`state idle ${phase === 'idle' ? 'on' : ''}`} id="sIdle">
                <svg className="idleCrown" viewBox="0 0 190 92" fill="none" stroke="#3dff3c" strokeWidth="5" strokeLinejoin="round">
                  <path d="M22 70 L12 24 L52 50 L95 10 L138 50 L178 24 L168 70 Z" fill="#0f3d10" fillOpacity=".55"></path>
                  <path d="M24 84 H166"></path>
                  <circle cx="12" cy="20" r="6" fill="#3dff3c"></circle>
                  <circle cx="95" cy="7" r="6" fill="#3dff3c"></circle>
                  <circle cx="178" cy="20" r="6" fill="#3dff3c"></circle>
                  <circle cx="52" cy="47" r="4" fill="#3dff3c"></circle>
                  <circle cx="138" cy="47" r="4" fill="#3dff3c"></circle>
                  <path d="M95 36 L104 52 L95 66 L86 52 Z" fill="#000"></path>
                  <path d="M58 58 L64 66 L58 72 L52 66 Z M132 58 L138 66 L132 72 L126 66 Z" fill="#000" strokeWidth="3"></path>
                </svg>
                <div className="idleText">
                  <i></i>
                  <span>Your Prediction <b>Will Appear Here</b></span>
                  <i></i>
                </div>
              </div>

              {/* SCANNING STATE */}
              <div className={`state scan ${phase === 'scan' ? 'on' : ''}`} id="sScan">
                <div className="laserY"></div>
                <div className="radar">
                  <div className="sweep"></div>
                  <div className="blip" style={{ left: '62%', top: '28%' }}></div>
                  <div className="blip" style={{ left: '30%', top: '62%', animationDelay: '.5s' }}></div>
                  <div className="rd" id="scanDigit">{scanDigit}</div>
                </div>
                <div className="scanInfo">
                  <div className="scanTitle">
                    SCANNING<em className="dots"></em>
                  </div>
                  <div className="scanStep" id="scanStep">{scanStep}</div>
                  <div className="bar">
                    <i id="scanBar" style={{ width: `${scanPct}%` }}></i>
                  </div>
                  <div className="scanMeta">
                    <span className="hexStream" id="hexStream">{hexStream}</span>
                    <span id="scanPct">{scanPct}%</span>
                  </div>
                </div>
                <div className="laser"></div>
                <i className="corner tl"></i>
                <i className="corner tr"></i>
                <i className="corner bl"></i>
                <i className="corner br"></i>
              </div>

              {/* RESULT STATE */}
              <div className={`state res ${phase === 'res' ? 'on' : ''}`} id="sRes">
                <div className="resTop">
                  <span className="live"></span>
                  PERIOD <b id="rPeriod">{resultPeriod}</b>
                  <span className={`shield ${resultShield ? 'show' : ''}`} id="rShield">
                    🛡 ANTI-LOSS
                  </span>
                </div>
                <div className="resMid">
                  <div className={`bs ${resultBS === 'BIG' ? 'big' : 'small'}`} id="rBS">
                    {resultBS}
                  </div>
                </div>
                <div className="resBot">
                  ACCURACY
                  <div className="meter">
                    <i id="rMeter" style={{ width: `${meterWidth}%` }}></i>
                  </div>
                  <b id="rConf">{resultConfidence.toFixed(1)}%</b> · <span className="pn" id="rPattern">{resultPattern}</span>
                </div>
              </div>

              <div className={`flash ${resultFlashGo ? 'go' : ''}`} id="flash"></div>
            </div>

            {/* Toast Notification */}
            <div className={`toast WIN ${showToast ? 'show' : ''}`} id="toast">
              {toastText}
            </div>

            {/* Generate Button (Electric Blue) */}
            <button
              className={`gen ${phase === 'scan' ? 'busy' : ''}`}
              id="genBtn"
              aria-label="Generate Prediction"
              onClick={handleGenClick}
            >
              <div className="genInner">
                <svg className="genBolt" viewBox="0 0 50 64">
                  <path d="M30 0 L4 36 L22 36 L12 64 L46 24 L28 24 L38 0 Z" fill="#90e0ef" stroke="#fff" strokeWidth="2" />
                </svg>
                <span className="genTxt">
                  {phase === 'scan' ? 'ANALYZING PATTERNS…' : <>GENERATE <em>PREDICTION</em></>}
                </span>
                <span className="genChevs">»»</span>
              </div>
              <span className="btnText"></span>
            </button>

            {/* HUD: 30s period + countdown */}
            <div className="hud">
              <div className="panel pPeriod">
                <div className="lbl">
                  <span className="live"></span>WINGO 30S · PERIOD
                </div>
                <div className="periodNum" id="hudPeriod">
                  {periodPrefix}
                  <span className="tail">{periodTail}</span>
                </div>
                <div className="hist" id="hist">
                  {history.length > 0 ? (
                    history.slice(0, 8).map((e, idx) => {
                      const o = e.outcome === 'LOSS' ? 'L' : e.outcome === 'JACKPOT' ? 'J' : 'W';
                      return (
                        <span key={idx} className={`p ${o}`}>
                          {o}
                        </span>
                      );
                    })
                  ) : (
                    <span>TRACKING…</span>
                  )}
                  <span className="stat">
                    <b>W {stats.win + stats.jackpot}</b> · <s>L {stats.loss}</s>
                  </span>
                </div>
              </div>
              <div className={`panel pTimer ${isTimerHot ? 'hot' : ''}`} id="pTimer">
                <svg className="ringT" viewBox="0 0 100 100">
                  <circle className="tr" cx="50" cy="50" r="42"></circle>
                  <circle
                    className="tp"
                    id="tProg"
                    cx="50"
                    cy="50"
                    r="42"
                    strokeDasharray="263.9"
                    strokeDashoffset={timerDashOffset}
                  ></circle>
                </svg>
                <div className="tTxt">
                  <span className="lbl">TIME</span>
                  <span className="tNum" id="tNum">{timerNum}</span>
                </div>
              </div>
            </div>

            <div className="note">pattern based prediction · play at your own risk</div>
          </div>

          {/* ================= LOGIN LAYER / PASSGATE ================= */}
          <section
            className={`login ${loginScreenGone ? 'gone' : ''}`}
            id="pg-gate"
            style={{ display: loginScreenGone ? 'none' : 'block' }}
          >
            <div className="lgFrame">
              <div className={`lgInner ${loginUnlockedVisual ? 'unlocked' : ''}`} id="lgInner">
                <div className="lgHead">
                  <svg viewBox="0 0 60 60" fill="none" stroke="#3dff3c" strokeWidth="4">
                    <circle cx="30" cy="30" r="18"></circle>
                    <circle cx="30" cy="30" r="5" fill="#3dff3c"></circle>
                    <path d="M30 2v14M30 44v14M2 30h14M44 30h14"></path>
                  </svg>
                  <h2>ACCESS <em>LOCKED</em></h2>
                </div>

                <div className="lockWrap" id="lockWrap" style={{ width: 'auto', height: 'auto' }}>
                  <div
                    className="fullFrameCardWrap"
                    onClick={() => setShowFullFrameModal(true)}
                    title="Click to view PNG Full Frame"
                  >
                    <img
                      src="/assets/profile.png"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = APP_CONFIG.profileImage;
                      }}
                      alt={APP_CONFIG.name}
                      className="fullFrameCardImg"
                    />
                    <div className="fullFrameCardTag">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                      </svg>
                      <span>PNG FULL FRAME</span>
                    </div>
                  </div>
                </div>

                <div className={`lgMsg ${loginMsg.isError ? 'err' : ''}`} id="pg-msg">
                  {loginMsg.text ? (
                    loginMsg.text
                  ) : (
                    <>লগইন করতে আপনার <b>ACCESS KEY</b> দিন</>
                  )}
                </div>

                {/* Mandatory Telegram Gate before login */}
                <a
                  href={APP_CONFIG.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tgGateBanner"
                  id="tgGateBanner"
                  onClick={redirectToTelegram}
                >
                  <div className="tgGatePulse"></div>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                  <div className="tgGateText">
                    <div className="tgGateTitle">HACK LOGIN করার আগে TELEGRAM এ যান</div>
                    <div className="tgGateSub">ACCESS KEY পেতে এখানে ক্লিক করুন ↗</div>
                  </div>
                </a>

                <div className={`keyBox ${keyBoxShake ? 'shake' : ''}`} id="keyBox">
                  <div className="keyIn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#3dff3c" strokeWidth="2" strokeLinecap="round">
                      <circle cx="8" cy="15" r="4"></circle>
                      <path d="M11 12l9-9M17 6l3 3M15 8l2 2"></path>
                    </svg>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="pg-pass"
                      placeholder="ENTER ACCESS KEY"
                      autoComplete="off"
                      spellCheck={false}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') unlock();
                      }}
                    />
                    <button
                      className="eye"
                      id="pwToggle"
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>

                <button
                  className={`lgBtn ${isLoginBusy ? 'busy' : ''}`}
                  id="pg-btn"
                  type="button"
                  disabled={isLoginBusy}
                  onClick={unlock}
                >
                  <span className="lbl2">
                    <svg className="bolt" viewBox="0 0 50 64">
                      <path d="M30 0 L4 36 L22 36 L12 64 L46 24 L28 24 L38 0 Z" fill="#ffe14a" stroke="#fff6b0" strokeWidth="2"></path>
                    </svg>
                    <span className="txt" id="loginBtnTxt">
                      {isLoginBusy ? 'যাচাই হচ্ছে…' : <>UNLOCK <em>ACCESS</em></>}
                    </span>
                    <span className="chev2">»</span>
                  </span>
                </button>

                {/* Telegram Channel Button */}
                <a
                  href={APP_CONFIG.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tgBtn"
                  id="tgBtn"
                  onClick={redirectToTelegram}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                  <span>GET KEY ON TELEGRAM</span>
                </a>

                <div className="lgFoot">
                  <span className="live"></span>SECURE ACCESS · PASSGATE PROTECTED
                </div>
                <div className={`lgFlash ${loginFlashGo ? 'go' : ''}`} id="lgFlash"></div>
              </div>
            </div>
            <div className="lgSide">
              {APP_CONFIG.name} · <b>AI POWERED PREDICTION BOT</b>
            </div>
          </section>
        </div>
      </div>

      {/* Full Screen Lightbox Modal for PNG Full Frame */}
      {showFullFrameModal && (
        <div
          className="fullFrameModalBackdrop"
          onClick={() => setShowFullFrameModal(false)}
        >
          <div
            className="fullFrameModalBox"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fullFrameModalHeader">
              <div className="fullFrameModalTitle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff2a3d" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span>CYBER HACK · RAHMAN VAI</span>
              </div>
              <button
                className="fullFrameCloseBtn"
                type="button"
                onClick={() => setShowFullFrameModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="fullFrameModalImgWrap">
              <img
                src="/assets/profile.png"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = APP_CONFIG.profileImage;
                }}
                alt="CYBER HACK RAHMAN VAI - Full Frame"
                className="fullFrameModalImg"
              />
            </div>

            <div className="fullFrameModalFooter">
              <a
                href={APP_CONFIG.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="fullFrameTgLink"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
                <span>JOIN TELEGRAM</span>
              </a>
              <a
                href={APP_CONFIG.profileImage}
                target="_blank"
                rel="noopener noreferrer"
                className="fullFrameExternalLink"
              >
                <span>KOMMODO LINK ↗</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
