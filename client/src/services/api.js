const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed.');
  return body;
}

export function createRoom(payload) {
  return request('/api/rooms', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getRoom(roomId) {
  return request(`/api/rooms/${encodeURIComponent(roomId)}`);
}
