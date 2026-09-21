import { useMemo, useState } from 'react';
import { createRoom } from './services/api';
import { connectSocket } from './services/socket';

function App() {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState('');
  const [createdRoom, setCreatedRoom] = useState('');

  const socketUrl = useMemo(
    () => import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
    []
  );

  async function handleCreateRoom() {
    if (!name.trim()) {
      setStatus('Enter your name first.');
      return;
    }

    try {
      const room = await createRoom({ playerName: name.trim(), maxPlayers: 5, rounds: 5 });
      setCreatedRoom(room.roomId);
      setStatus('Room created. Socket connection is ready to be wired into the lobby.');
      connectSocket(socketUrl);
    } catch (error) {
      setStatus(error.message);
    }
  }

  function handleJoinRoom() {
    if (!name.trim() || !roomId.trim()) {
      setStatus('Enter your name and a Room ID.');
      return;
    }
    setStatus(`Join flow ready for room ${roomId.trim().toUpperCase()}.`);
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">REAL-TIME MULTIPLAYER</p>
        <h1>WordWars</h1>
        <p className="tagline">Name. Place. Animal. Thing. Battle it out live.</p>

        <div className="panel">
          <label>
            Your name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              maxLength={24}
            />
          </label>

          <div className="action-grid">
            <button className="primary" onClick={handleCreateRoom}>
              Create Room
            </button>
            <div className="join-box">
              <input
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
                placeholder="Room ID"
              />
              <button onClick={handleJoinRoom}>Join Room</button>
            </div>
          </div>

          {createdRoom && (
            <div className="room-badge">
              <span>Room ID</span>
              <strong>{createdRoom}</strong>
            </div>
          )}

          {status && <p className="status">{status}</p>}
        </div>
      </section>
    </main>
  );
}

export default App;
