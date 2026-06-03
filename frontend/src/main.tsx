import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Intercept all fetch requests to /api/ and add localtunnel bypass header
const { fetch: originalFetch } = window;
window.fetch = async (input, init) => {
  let isApi = false;
  if (typeof input === 'string') {
    isApi = input.startsWith('/api') || input.includes('/api/');
  } else if (input instanceof URL) {
    isApi = input.pathname.startsWith('/api') || input.pathname.includes('/api/');
  } else if (input instanceof Request) {
    try {
      const pathname = new URL(input.url, window.location.origin).pathname;
      isApi = pathname.startsWith('/api') || pathname.includes('/api/');
    } catch {
      isApi = input.url.includes('/api/');
    }
  }

  if (isApi) {
    init = init || {};
    if (init.headers instanceof Headers) {
      init.headers.set('Bypass-Tunnel-Reminder', 'true');
      init.headers.set('ngrok-skip-browser-warning', 'true');
    } else if (Array.isArray(init.headers)) {
      init.headers.push(['Bypass-Tunnel-Reminder', 'true']);
      init.headers.push(['ngrok-skip-browser-warning', 'true']);
    } else {
      init.headers = {
        ...init.headers,
        'Bypass-Tunnel-Reminder': 'true',
        'ngrok-skip-browser-warning': 'true',
      };
    }
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

