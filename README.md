# ⚔️ Word Arena

**Word Arena** is a real-time multiplayer **Name, Place, Animal, Thing** game built for fast, competitive rounds with friends.

Create a room, invite other players, get a random starting letter, fill all four categories before the timer runs out, and let the server validate and score every answer.

## ✨ Highlights

- 🎮 **2–5 players per room**
- 🏠 Create a private room or join with a Room ID
- 👑 Host-controlled game start and round progression
- 🔤 Server-generated random letters
- ⏱️ **Server-authoritative countdown timer**
- 📝 Live answer drafts are synchronized to the server
- 🔒 One final submission per player per round
- 🤖 **Gemini-powered answer validation** on the backend
- 🛡️ Automatic fallback validation when Gemini is unavailable
- 🔎 Duplicate-answer detection
- 🏆 Round scoring + cumulative leaderboard
- 🔄 Reconnection support during games
- 👑 Automatic host transfer when the host disconnects
- 🎯 **1–10 rounds**, configurable when creating a room
- ⏳ **15–120 seconds per round**, configurable by the host
- 🥇 Final champion screen after the last round

## 🕹️ How the game works

1. A player creates a room and becomes the host.
2. Other players join using the Room ID.
3. The host starts the game once at least **2 players are connected**.
4. The server generates a starting letter.
5. Players enter:
   - **Name**
   - **Place**
   - **Animal**
   - **Thing**
6. Players can lock their answers early, or leave them as drafts.
7. When everyone submits—or the timer reaches zero—the server validates the answers.
8. Duplicate valid answers receive fewer points.
9. Results and the updated leaderboard are shown.
10. The host starts the next round until the configured number of rounds is completed.

### Scoring

| Answer status | Points |
|---|---:|
| Valid + unique | **10** |
| Valid + duplicate | **5** |
| Invalid / empty | **0** |

## 🤖 AI answer validation

Word Arena uses **Google Gemini** as a server-side judge for submitted answers.

The validator checks whether each answer:

- Starts with the required letter
- Matches the requested category
- Is a recognizable real-world answer
- Is not obvious gibberish
- Is reasonable for the category

There is also a local fallback validator, so the game can still run without a Gemini API key or when the API request fails.

> **Important:** The Gemini API key stays on the backend. Never expose it through a `VITE_*` environment variable.

## 🧱 Architecture

```text
┌──────────────────────────────┐
│        React + Vite          │
│         Frontend             │
│                              │
│  Home → Lobby → Game →       │
│  Results → Final Leaderboard │
└──────────────┬───────────────┘
               │
         REST + Socket.IO
               │
┌──────────────▼───────────────┐
│      Node.js + Express       │
│         Backend              │
│                              │
│  Room Management             │
│  Game State                  │
│  Timers / Submissions        │
│  Scoring / Duplicates        │
│  Reconnection / Host Switch  │
└──────────────┬───────────────┘
               │
          Gemini API
               │
┌──────────────▼───────────────┐
│     AI Answer Validation     │
└──────────────────────────────┘
```

## 🛠️ Tech stack

### Frontend

- **React 19**
- **Vite 7**
- **Socket.IO Client**
- JavaScript / CSS

### Backend

- **Node.js**
- **Express 5**
- **Socket.IO**
- **dotenv**
- JavaScript

### AI

- **Google Gemini API**
- Server-side validation service
- JSON-based structured validation results

### Deployment

- **Vercel** → React/Vite frontend
- **Render** → Node.js/Express/Socket.IO backend
- **Google Gemini API** → answer validation

## 📁 Project structure

```text
word-arena/
│
├── client/                         # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx                # Main application flow
│   │   ├── main.jsx               # React entry point
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/                  # Main screens
│   │   ├── services/
│   │   │   ├── api.js             # HTTP/API calls
│   │   │   └── socket.js          # Socket.IO client
│   │   └── styles.css             # Global styling
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── server/                         # Node.js backend
│   ├── src/
│   │   ├── controllers/
│   │   │   └── roomController.js # Room REST controller
│   │   ├── routes/
│   │   │   └── roomRoutes.js     # Room API routes
│   │   ├── services/
│   │   │   ├── gameService.js    # Letters, scoring, leaderboard
│   │   │   ├── roomService.js    # Room/player state
│   │   │   └── validationService.js # Gemini + fallback validation
│   │   ├── sockets/
│   │   │   └── gameSocket.js     # Real-time game events
│   │   ├── utils/
│   │   │   └── generateRoomId.js # Room ID generation
│   │   └── server.js              # Server entry point
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

## 🚀 Run locally

### 1. Clone the repository

```bash
git clone https://github.com/RajCodes2006/word-arena.git
cd word-arena
```

### 2. Start the backend

```bash
cd server
npm install
npm run dev
```

The backend runs on port **5000** by default.

### 3. Start the frontend

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite development URL, normally:

```text
http://localhost:5173
```

## 🔐 Environment variables

### Backend — `server/.env`

Copy `server/.env.example`:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
```

### Frontend — `client/.env`

Copy `client/.env.example`:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

For production, replace the frontend URLs with your deployed Render backend URL.

## 🌐 Deployment

### Frontend → Vercel

Deploy the `client/` directory as a Vercel project.

Set:

```env
VITE_API_URL=https://YOUR-BACKEND-URL
VITE_SOCKET_URL=https://YOUR-BACKEND-URL
```

### Backend → Render

Deploy the `server/` directory as a Render web service.

Set:

```env
PORT=5000
CLIENT_ORIGIN=https://YOUR-VERCEL-URL
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-3.8-flash
```

Then verify the backend health endpoint:

```text
/health
```

## 🔄 Real-time game events

The multiplayer layer uses Socket.IO for low-latency state updates.

Core events include:

```text
room:join
room:start
room:leave

round:draft
round:submit
round:next

round:started
round:ended
game:finished
room:state
```

This keeps the **server authoritative** for game state, timers, submissions, scoring, and round transitions.

## 💾 Data storage

The current MVP uses **in-memory state**.

That means:

- No database is required
- Active rooms live only in the backend process
- Drafts, submissions, scores, timers, and room state are stored in memory
- Restarting/redeploying the backend clears active games

For a larger production version, persistent storage could be added for accounts, match history, statistics, and rankings.

## 🧪 Validation fallback

When `GEMINI_API_KEY` is missing—or the Gemini request fails—the backend automatically falls back to local validation.

The fallback currently checks:

- Non-empty answers
- Correct starting letter
- Basic plausibility for names

This keeps the core game playable even without AI validation.

## 🔒 Security notes

- Gemini credentials are server-side only.
- Client input is sanitized and length-limited before processing.
- The server remains authoritative for submissions and scoring.
- Answers are treated as untrusted input during AI validation.
- CORS is controlled through `CLIENT_ORIGIN`.

## 🗺️ Current MVP flow

```text
Home
  ↓
Create / Join Room
  ↓
Lobby
  ↓
Host Starts Game
  ↓
Timed Round
  ↓
Draft / Submit
  ↓
Gemini or Fallback Validation
  ↓
Duplicate Detection + Scoring
  ↓
Round Results
  ↓
Next Round
  ↓
Final Leaderboard
```

## 📌 Current limitations

This is an **MVP**, so it intentionally does not include:

- User authentication
- Persistent accounts
- Match history
- Database-backed leaderboards
- Spectator mode
- Private invite links
- Horizontal scaling across multiple backend instances

The biggest architectural limitation is the in-memory game state: a backend restart ends all active rooms.

## 🔮 Future improvements

Possible next steps:

- PostgreSQL/Redis-backed room state
- Authentication and player profiles
- Persistent match history
- Global leaderboards
- Better answer dictionaries and validation confidence
- Anti-cheat controls
- Room invite links
- Realtime presence indicators
- Scalable Socket.IO infrastructure

## 👨‍💻 Author

Built by **RajCodes2006**.

GitHub: https://github.com/RajCodes2006

## 📄 License

No license file is currently included in the repository.

