// js/config.js — set the backend API base URL per environment.
// Loaded as a plain script (before the module bundle) so it's easy to edit post-deploy
// without touching the app code, e.g. in Cloudflare Pages you can override this file directly.
window.KAREL_API_BASE =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : 'https://REPLACE-WITH-YOUR-RAILWAY-DOMAIN.up.railway.app/api';
