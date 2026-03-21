import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0C10',
        color: '#fff',
        fontFamily: 'inherit',
        textAlign: 'center',
        gap: '1.5rem',
      }}
    >
      <h1
        style={{
          fontSize: '6rem',
          fontWeight: 800,
          margin: 0,
          color: '#E50914',
          lineHeight: 1,
        }}
      >
        404
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#aaa', margin: 0 }}>
        Oops — this page doesn&apos;t exist.
      </p>
      <Link
        to="/"
        style={{
          marginTop: '0.5rem',
          padding: '0.65rem 1.75rem',
          background: '#E50914',
          color: '#fff',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        Back to Home
      </Link>
    </div>
  );
}

export default NotFound;
