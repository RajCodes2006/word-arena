import { useMemo } from 'react';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '24px',
    boxSizing: 'border-box',
    background:
      'radial-gradient(circle at 50% 20%, rgba(255,198,46,0.10), transparent 34%), #061735',
    color: '#fff',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    width: 'min(560px, 100%)',
    textAlign: 'center',
    padding: '48px 34px',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '28px',
    background: 'rgba(8, 28, 62, 0.86)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(18px)',
  },
  mark: {
    width: 72,
    height: 72,
    margin: '0 auto 24px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: 20,
    background: '#FFC62E',
    color: '#06245A',
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: '-0.08em',
    boxShadow: '0 12px 30px rgba(255,198,46,0.18)',
  },
  code: {
    margin: 0,
    fontSize: 'clamp(72px, 15vw, 120px)',
    lineHeight: 0.9,
    fontWeight: 950,
    letterSpacing: '-0.08em',
    color: '#FFC62E',
  },
  title: {
    margin: '22px 0 10px',
    fontSize: 'clamp(28px, 5vw, 42px)',
    lineHeight: 1,
    letterSpacing: '-0.04em',
  },
  text: {
    margin: '0 auto',
    maxWidth: 430,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 16,
    lineHeight: 1.65,
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 30,
  },
  primary: {
    border: 0,
    borderRadius: 14,
    padding: '13px 20px',
    background: '#FFC62E',
    color: '#06245A',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondary: {
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 14,
    padding: '13px 20px',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export default function NotFound() {
  const canGoBack = useMemo(() => window.history.length > 1, []);

  const goHome = () => {
    window.location.href = '/';
  };

  const goBack = () => {
    if (canGoBack) window.history.back();
    else goHome();
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.mark}>W</div>
        <p style={styles.code}>404</p>
        <h1 style={styles.title}>This arena doesn’t exist.</h1>
        <p style={styles.text}>
          The page you tried to enter isn’t part of Word Arena. Head back to the lobby
          and jump into a match.
        </p>

        <div style={styles.actions}>
          <button type="button" style={styles.primary} onClick={goHome}>
            Back to Word Arena
          </button>
          <button type="button" style={styles.secondary} onClick={goBack}>
            Go Back
          </button>
        </div>
      </section>
    </main>
  );
}
