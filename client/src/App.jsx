import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoom } from './services/api';
import { connectSocket } from './services/socket';
import './styles.css';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const CATEGORIES = [
  ['name', 'Name'],
  ['place', 'Place'],
  ['animal', 'Animal'],
  ['thing', 'Thing']
];
const SESSION_KEY = 'wordwars.session.v2';

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

function App() {
  const socket = useMemo(() => connectSocket(SOCKET_URL), []);
  const saved = useMemo(loadSession, []);
  const [session, setSession] = useState(saved);
  const [screen, setScreen] = useState(saved ? 'LOBBY' : 'HOME');
  const [room, setRoom] = useState(null);
  const [name, setName] = useState(saved?.displayName || '');
  const [roomCode, setRoomCode] = useState(saved?.roomId || '');
  const [settings, setSettings] = useState({ maxPlayers: 5, rounds: 5, roundSeconds: 45 });
  const [letter, setLetter] = useState('');
  const [round, setRound] = useState(0);
  const [endsAt, setEndsAt] = useState(null);
  const [offset, setOffset] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [answers, setAnswers] = useState({ name: '', place: '', animal: '', thing: '' });
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [board, setBoard] = useState([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const timeoutDraftSent = useRef(0);
  const leavingRef = useRef(false);
  const sessionRef = useRef(session);
  const nameRef = useRef(name);
  sessionRef.current = session;
  nameRef.current = name;

  const me = room?.players?.find((p) => p.playerId === session?.playerId);
  const isHost = Boolean(me && room?.hostId === me.playerId);
  const online = room?.players?.filter((p) => p.connected) || [];

  useEffect(() => {
    const setRoomState = (next) => {
      if (leavingRef.current) return;

      setRoom(next);
      const currentSession = sessionRef.current;
      const currentPlayer = next.players?.find(
        (player) => player.playerId === currentSession?.playerId
      );

      if (currentPlayer) setSubmitted(Boolean(currentPlayer.submitted));
      if (next.currentLetter) setLetter(next.currentLetter);
      if (next.currentRound) setRound(next.currentRound);
      setEndsAt(next.roundEndsAt || null);

      if (next.state === 'WAITING') setScreen('LOBBY');
      if (next.state === 'PLAYING') setScreen('GAME');
      if (next.state === 'RESULTS') setScreen('RESULTS');
      if (next.state === 'FINISHED') setScreen('FINISHED');
    };
    const joined = ({
      room: next,
      playerId,
      results: joinedResults,
      leaderboard: joinedBoard,
      round: joinedRound,
      letter: joinedLetter,
      roundEndsAt: joinedEndsAt,
      serverNow
    }) => {
      const currentSession = sessionRef.current;
      const nextSession = {
        roomId: next.roomId,
        playerId,
        displayName: currentSession?.displayName || nameRef.current.trim() || 'Player'
      };

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      setRoom(next);
      setRound(joinedRound || next.currentRound || 0);
      setLetter(joinedLetter || next.currentLetter || '');
      setEndsAt(joinedEndsAt || next.roundEndsAt || null);
      if (serverNow && joinedEndsAt) setOffset(serverNow - Date.now());
      setResults(joinedResults || null);
      setBoard(joinedBoard || []);
      setSubmitted(Boolean(
        next.players?.find((player) => player.playerId === playerId)?.submitted
      ));
      setScreen(
        next.state === 'PLAYING'
          ? 'GAME'
          : next.state === 'RESULTS'
            ? 'RESULTS'
            : next.state === 'FINISHED'
              ? 'FINISHED'
              : 'LOBBY'
      );
      leavingRef.current = false;
      setBusy(false);
    };
    const started = ({ room: next, letter: nextLetter, currentRound, serverNow, roundEndsAt }) => {
      setRoom(next);
      setLetter(nextLetter);
      setRound(currentRound);
      setEndsAt(roundEndsAt);
      setOffset(serverNow - Date.now());
      setAnswers({ name: '', place: '', animal: '', thing: '' });
      setSubmitted(false);
      setResults(null);
      timeoutDraftSent.current = 0;
      setScreen('GAME');
    };
    const ended = ({ room: next, results: nextResults, leaderboard: nextBoard, final }) => {
      setRoom(next);
      setResults(nextResults);
      setBoard(nextBoard || []);
      setSubmitted(true);
      setScreen(final ? 'FINISHED' : 'RESULTS');
    };
    const submittedEvent = () => setSubmitted(true);
    const error = ({ message }) => {
      setNotice(message || 'Something went wrong.');
      setBusy(false);

      if (!room && saved?.roomId) {
        sessionStorage.removeItem(SESSION_KEY);
        setSession(null);
        setRoom(null);
        setScreen('HOME');
      }
    };

    socket.on('room:state', setRoomState);
    socket.on('room:joined', joined);
    socket.on('round:started', started);
    socket.on('round:submitted', submittedEvent);
    socket.on('round:ended', ended);
    socket.on('game:finished', ended);
    socket.on('error_message', error);

    const rejoin = () => {
      const current = sessionRef.current || saved;
      if (!current?.roomId || !current?.playerId) return;
      socket.emit('room:join', current);
    };

    socket.on('connect', rejoin);

    if (saved?.roomId && saved?.playerId && socket.connected) {
      rejoin();
    }

    return () => {
      socket.off('room:state', setRoomState);
      socket.off('room:joined', joined);
      socket.off('round:started', started);
      socket.off('round:submitted', submittedEvent);
      socket.off('round:ended', ended);
      socket.off('game:finished', ended);
      socket.off('error_message', error);
      socket.off('connect', rejoin);
    };
  }, [socket, saved]);

  useEffect(() => {
    if (!endsAt) { setSeconds(0); return undefined; }
    const tick = () => setSeconds(Math.max(0, Math.ceil((endsAt - (Date.now() + offset)) / 1000)));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [endsAt, offset]);

  useEffect(() => {
    if (screen !== 'GAME' || seconds !== 0 || submitted || !session || !round) return;
    if (timeoutDraftSent.current === round) return;

    timeoutDraftSent.current = round;
    emit('round:draft', {
      roomId: session.roomId,
      playerId: session.playerId,
      round,
      answers
    });
  }, [answers, round, screen, seconds, session, submitted]);

  const emit = (event, payload) => {
    if (socket.connected) socket.emit(event, payload);
    else socket.once('connect', () => socket.emit(event, payload));
  };

  async function create() {
    if (!name.trim()) return setNotice('Enter your name first.');
    setBusy(true); setNotice('');
    try {
      const data = await createRoom({ playerName: name.trim(), ...settings });
      const next = { roomId: data.roomId, playerId: data.playerId, displayName: name.trim() };
      leavingRef.current = false;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setSession(next); setRoom(data.room); setRoomCode(data.roomId); setScreen('LOBBY');
      emit('room:join', next);
    } catch (e) { setNotice(e.message); setBusy(false); }
  }

  function join() {
    if (!name.trim() || !roomCode.trim()) return setNotice('Enter your name and a Room ID.');
    const next = { roomId: roomCode.trim().toUpperCase(), playerId: crypto.randomUUID(), displayName: name.trim() };
    leavingRef.current = false;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next); setBusy(true); setNotice(''); setScreen('LOBBY'); emit('room:join', next);
  }

  function start() {
    setNotice('');
    emit('room:start', { roomId: session.roomId, playerId: session.playerId });
  }

  function updateAnswer(category, value) {
    const nextAnswers = { ...answers, [category]: value };
    setAnswers(nextAnswers);

    if (screen === 'GAME' && room?.state === 'PLAYING' && !submitted && session) {
      emit('round:draft', {
        roomId: session.roomId,
        playerId: session.playerId,
        round,
        answers: nextAnswers
      });
    }
  }

  function submit() {
    if (submitted || seconds <= 0) return;
    if (!Object.values(answers).some((v) => v.trim())) return setNotice('Enter at least one answer.');
    emit('round:submit', { roomId: session.roomId, playerId: session.playerId, round, answers });
  }

  function nextRound() {
    emit('round:next', { roomId: session.roomId, playerId: session.playerId });
  }

  function leave() {
    if (session) emit('room:leave', { roomId: session.roomId, playerId: session.playerId });
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null); setRoom(null); setScreen('HOME'); setResults(null); setBoard([]);
    setAnswers({ name: '', place: '', animal: '', thing: '' });
    setLetter(''); setNotice('');
  }

  async function copyCode() {
    const code = room?.roomId || roomCode;
    try { await navigator.clipboard.writeText(code); setNotice('Room ID copied.'); }
    catch { setNotice('Copy failed. Select the Room ID manually.'); }
  }

  if (screen === 'HOME') {
    return <div className="home"><div className="grid-bg" /><main className="home-wrap">
      <header className="brand"><div className="logo">WW</div><div><b>WordWars</b><span>Real-time NPAT battles</span></div><em>LIVE MULTIPLAYER</em></header>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">NAME • PLACE • ANIMAL • THING</p>
          <h1>Think fast.<br /><span>Type faster.</span></h1>
          <p>One letter. Four categories. One shot. Battle with 2–5 players in real time.</p>
          <div className="stats"><div><b>2–5</b><span>players</span></div><div><b>45s</b><span>default round</span></div><div><b>10</b><span>unique points</span></div></div>
        </div>
        <section className="card create-card">
          <p className="card-kicker">CREATE A ROOM</p>
          <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Raj" maxLength={24} /></label>
          <div className="selects">
            <label>Players<select value={settings.maxPlayers} onChange={(e) => setSettings({ ...settings, maxPlayers: Number(e.target.value) })}>{[2,3,4,5].map(v => <option key={v}>{v}</option>)}</select></label>
            <label>Rounds<select value={settings.rounds} onChange={(e) => setSettings({ ...settings, rounds: Number(e.target.value) })}>{[3,5,7,10].map(v => <option key={v}>{v}</option>)}</select></label>
            <label>Seconds<select value={settings.roundSeconds} onChange={(e) => setSettings({ ...settings, roundSeconds: Number(e.target.value) })}>{[30,45,60,90].map(v => <option key={v}>{v}</option>)}</select></label>
          </div>
          <button className="primary wide" onClick={create} disabled={busy}>{busy ? 'Creating...' : 'Create New Room'}</button>
          <div className="or">OR JOIN EXISTING</div>
          <div className="join"><input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="WW-ABCD" maxLength={7} /><button onClick={join}>Join</button></div>
          {notice && <Notice text={notice} />}
        </section>
      </section>
      <footer>Server-authoritative timers • Server-side answer validation • Up to 5 players per room</footer>
    </main></div>;
  }

  const meta = screen === 'GAME' ? 'Round ' + round + '/' + room?.totalRounds : screen === 'LOBBY' ? 'Lobby' : screen === 'RESULTS' ? 'Round ' + results?.round + ' results' : 'Final results';

  return <div className="app">
    <header className="topbar">
      <button className="brand-btn" onClick={leave}><span>WW</span> WordWars</button>
      <button className="room-id" onClick={copyCode}><small>ROOM</small><b>{room?.roomId || roomCode}</b><span>Copy</span></button>
      <strong className="meta">{meta}</strong>
      <button className="leave" onClick={leave}>Leave</button>
    </header>

    {screen === 'LOBBY' && <Lobby room={room} online={online} isHost={isHost} onStart={start} notice={notice} />}
    {screen === 'GAME' && <Game room={room} letter={letter} seconds={seconds} answers={answers} updateAnswer={updateAnswer} submitted={submitted} onSubmit={submit} session={session} notice={notice} />}
    {screen === 'RESULTS' && <Results results={results} board={board} isHost={isHost} onNext={nextRound} />}
    {screen === 'FINISHED' && <Finished board={board} onNew={leave} />}
  </div>;
}

function Lobby({ room, online, isHost, onStart, notice }) {
  return <main className="layout"><section className="card panel">
    <div className="row between"><div><p className="eyebrow">GAME LOBBY</p><h1>Bring your squad in.</h1><p className="muted">Share the Room ID and start when everyone is connected.</p></div><div className="count"><b>{online.length}/{room?.maxPlayers}</b><small>online</small></div></div>
    <div className="players">{(room?.players || []).map(p => <div className="player" key={p.playerId}><span className="avatar">{p.displayName[0].toUpperCase()}</span><div><b>{p.displayName}</b><small>{p.playerId === room.hostId ? 'Host' : p.connected ? 'Connected' : 'Offline'}</small></div><i className={p.connected ? 'online' : ''} /></div>)}</div>
    {online.length < 2 && <div className="waiting"><i />Waiting for one more player...</div>}
    {notice && <Notice text={notice} />}
  </section><aside className="card side"><p className="card-kicker">MATCH SETTINGS</p><Setting a="Players" b={(room?.maxPlayers || '') + ' max'} /><Setting a="Rounds" b={room?.totalRounds} /><Setting a="Round time" b={(room?.roundSeconds || '') + 's'} /><Setting a="Scoring" b="10 / 5 / 0" /><hr /><button className="primary wide" disabled={!isHost || online.length < 2} onClick={onStart}>{isHost ? 'Start WordWars' : 'Waiting for host'}</button><p className="small muted">Minimum 2 connected players. Maximum 5.</p></aside></main>;
}

function Game({ room, letter, seconds, answers, updateAnswer, submitted, onSubmit, session, notice }) {
  return <main className="layout"><section className="card panel">
    <div className="row between"><div><p className="eyebrow">YOUR TURN</p><h1>Think fast.</h1></div><div className={'timer ' + (seconds <= 10 ? 'danger' : '')}><b>{String(seconds).padStart(2, '0')}</b><small>SEC</small></div></div>
    <div className="letter"><small>YOUR LETTER</small><strong>{letter || room?.currentLetter || '?'}</strong><p>Every answer must start with this letter.</p></div>
    <div className="answer-grid">{CATEGORIES.map(([key, label]) => <label key={key}>{label}<input value={answers[key]} onChange={e => updateAnswer(key, e.target.value)} placeholder={'Enter a ' + label.toLowerCase()} maxLength={80} disabled={submitted || seconds <= 0} autoComplete="off" /></label>)}</div>
    <div className="submit"><p className="small muted">{submitted ? 'Submitted. Waiting for the round to finish.' : 'Unique valid = 10. Duplicate valid = 5.'}</p><button className="primary" disabled={submitted || seconds <= 0} onClick={onSubmit}>{submitted ? 'Submitted ✓' : 'Lock My Answers'}</button></div>
    {notice && <Notice text={notice} />}
  </section><aside className="card side"><p className="card-kicker">LIVE SCORES</p>{(room?.players || []).slice().sort((a,b) => b.score-a.score).map((p,i) => <div className="score" key={p.playerId}><span>{i+1}</span><b>{p.displayName}{p.playerId === session.playerId ? ' · YOU' : ''}</b><strong>{p.score}</strong><i className={p.connected ? 'online' : ''} /></div>)}<div className="tip"><b>Tip</b><span>Rare valid answers beat obvious duplicates.</span></div></aside></main>;
}

function Results({ results, board, isHost, onNext }) {
  return <main className="results-layout"><section className="card panel"><div className="row between"><div><p className="eyebrow">ROUND COMPLETE</p><h1>Letter <span>{results?.letter || '?'}</span> is done.</h1></div><b className="verified">{results?.validationMode === 'gemini-api' ? 'API VERIFIED' : 'BASIC FALLBACK'}</b></div>
    <div className="table-wrap"><table><thead><tr><th>PLAYER</th>{CATEGORIES.map(([, label]) => <th key={label}>{label}</th>)}<th>ROUND</th></tr></thead><tbody>{(results?.players || []).map(p => <tr key={p.playerId}><td><b>{p.displayName}</b></td>{CATEGORIES.map(([key]) => { const x = p.breakdown?.[key]; return <td key={key}><strong className={x?.valid ? 'valid' : 'invalid'}>{x?.answer || '—'}</strong><small>{x?.valid ? (x.duplicate ? 'duplicate · +5' : 'valid · +10') : 'invalid · +0'}</small></td>; })}<td><b>{p.roundScore}</b></td></tr>)}</tbody></table></div>
    {isHost && <div className="submit"><p className="small muted">Host controls the next round.</p><button className="primary" onClick={onNext}>Next Round →</button></div>}
  </section><aside className="card side"><p className="card-kicker">LEADERBOARD</p>{(board || []).map(p => <div className="score" key={p.playerId}><span>{p.rank}</span><b>{p.displayName}</b><strong>{p.score}</strong></div>)}</aside></main>;
}

function Finished({ board, onNew }) {
  return <main className="finish"><section className="card champion"><p className="eyebrow">GAME COMPLETE</p><div className="crown">✦</div><small>WORDWARS CHAMPION</small><h1>{board?.[0]?.displayName || 'Winner'}</h1><strong>{board?.[0]?.score || 0}<span> pts</span></strong><button className="primary" onClick={onNew}>Start a New Room</button></section><aside className="card side final"><p className="card-kicker">FINAL STANDINGS</p>{(board || []).map(p => <div className="final-row" key={p.playerId}><span>{p.rank}</span><b>{p.displayName}</b><strong>{p.score}</strong></div>)}</aside></main>;
}

function Setting({ a, b }) { return <div className="setting"><span>{a}</span><b>{b}</b></div>; }
function Notice({ text }) { return <div className="notice">{text}</div>; }

export default App;
