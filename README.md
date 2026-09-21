# WordWars

Real-time multiplayer **Name, Place, Animal, Thing** game.

## Starter stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Realtime:** Socket.IO
- **Validation:** API-ready validation service
- **Storage:** In-memory for MVP (database can be added later)

## Project structure

```text
WordWars/
├── client/              # React frontend
├── server/              # Node/Express + Socket.IO backend
├── .gitignore
└── README.md
```

## Run locally

### 1. Start the server

```bash
cd server
npm install
npm run dev
```

Server runs on `http://localhost:5000`.

### 2. Start the client

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Vite will show the local frontend URL, normally `http://localhost:5173`.

## MVP flow

1. Create a room.
2. Share the room ID.
3. 4–5 players join.
4. Host starts the game.
5. Server generates a letter.
6. Players enter Name, Place, Animal and Thing.
7. Players submit before the timer ends.
8. Server validates answers and calculates scores.
9. Results and leaderboard are shown.

## Important

The starter currently uses in-memory room/game state. That is intentional for the first build so we can get multiplayer logic working before adding PostgreSQL/Supabase persistence.

API validation is isolated in `server/src/services/validationService.js`, so a real validation provider can be plugged in without rewriting the game engine.
