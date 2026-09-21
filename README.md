# WordWars

Real-time multiplayer Name, Place, Animal, Thing game for 2–5 players.

## Stack
- React + Vite
- Node.js + Express
- Socket.IO
- Server-side Gemini API validation
- In-memory game state for the MVP

## Features
- Create or join a Room ID
- 2–5 players per room
- Host-controlled game start
- Server-generated letters
- Server-authoritative round timer
- One submission per player per round
- Name, Place, Animal, Thing answer fields
- API validation with Gemini when GEMINI_API_KEY is configured
- Automatic fallback to basic letter validation when the API is unavailable
- Duplicate detection and scoring (10 unique / 5 duplicate / 0 invalid)
- Round results and cumulative leaderboard
- Host transfer on disconnect
- Multiple rounds and final champion screen

## Run locally

Terminal 1:
cd server
npm install
npm run dev

Terminal 2:
cd client
npm install
npm run dev

Open the Vite URL, normally http://localhost:5173.

## API validation

Copy server/.env.example to server/.env and add GEMINI_API_KEY. Keep the key on the server; never use a VITE_* variable for it.

Without a key, WordWars still runs using the basic first-letter check.

## Game flow

Home -> Create/Join Room -> Lobby -> Start -> Timed round -> Submit -> API validation -> Duplicate scoring -> Results -> Next round -> Final leaderboard

## Notes

The MVP stores active rooms in memory. Restarting the server clears active games. PostgreSQL/Supabase persistence can be added after the core multiplayer flow is stable.
