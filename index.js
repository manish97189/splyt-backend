/**
 * index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Render (and many other PaaS platforms) look for "index.js" as the default
 * entry point when no explicit start command is configured.
 *
 * Our actual server lives in server.js, so this file simply delegates to it.
 * ─────────────────────────────────────────────────────────────────────────────
 */
require('./server');
