// Minimal test — does React even render?
import { useState } from 'react';

export default function Test() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#ff6b35', background: '#0a0a0f', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <h1>🔥 RISE Phoenix — Test Page</h1>
      <p>If you see this, React renders fine.</p>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)} style={{ padding: '1rem 2rem', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 50, fontSize: 16, cursor: 'pointer' }}>
        Click me
      </button>
    </div>
  );
}