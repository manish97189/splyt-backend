/**
 * config/db.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Create and export a Sequelize instance connected to PostgreSQL.
 *
 * WHY A CONNECTION URL INSTEAD OF INDIVIDUAL FIELDS?
 * ────────────────────────────────────────────────────
 * Neon (and most cloud Postgres providers) give you a single connection string:
 *   postgresql://user:password@host/dbname?sslmode=require&channel_binding=require
 *
 * Sequelize can accept this URL directly as its first argument — no need to
 * split it into host/port/user/password/database individually.
 *
 * HOW SSL WORKS HERE:
 * ────────────────────
 * Neon enforces TLS on every connection. Without the `ssl` option in Sequelize,
 * Node's pg driver would reject the connection or Neon would refuse it.
 * We set `rejectUnauthorized: false` — this means we trust Neon's certificate
 * without needing to bundle Neon's CA certificate locally. Fine for dev/prod
 * with a managed cloud provider; tighten for on-prem deployments.
 *
 * `channel_binding=require` in the URL is Neon's SCRAM-SHA-256-PLUS auth
 * mechanism — Node's pg driver handles it automatically; we just pass it
 * through in the URL string.
 *
 * CONNECTION POOL:
 * ─────────────────
 * Neon's pooler endpoint (the `-pooler` subdomain in the URL) is already a
 * PgBouncer connection pooler. Keeping our Sequelize pool small (max 5)
 * avoids hitting Neon's connection limits on the free tier.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Sequelize } = require('sequelize');

// The full Neon connection URL lives in .env as DATABASE_URL.
// dotenv (called in server.js before this file is required) puts it in
// process.env so we can read it here without importing dotenv again.
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    '❌  DATABASE_URL is not set. ' +
    'Add it to your .env file — see .env.example for the format.'
  );
}

const sequelize = new Sequelize(
  DATABASE_URL, // ← Sequelize accepts a full postgres:// URL as the first arg
  {
    dialect: 'postgres',

    // ── SSL configuration ──────────────────────────────────────────────────
    // Required by Neon. The `ssl` block is passed directly to the pg driver.
    //   rejectUnauthorized: false → trust Neon's certificate automatically
    //   (Neon uses a valid public CA cert, so this is safe in practice)
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },

    // ── Logging ────────────────────────────────────────────────────────────
    // Print SQL queries to the console in development — useful for learning
    // what Sequelize generates under the hood. Silenced in production.
    logging: process.env.NODE_ENV === 'development' ? console.log : false,

    // ── Connection Pool ────────────────────────────────────────────────────
    // Neon's free tier allows ~20 simultaneous connections via its pooler.
    // We keep max at 5 so we stay well within that limit.
    pool: {
      max: 5,          // maximum open connections in the pool
      min: 0,          // minimum idle connections (0 = release all when idle)
      acquire: 30000,  // ms before "connection not acquired" error
      idle: 10000,     // ms a connection can be idle before being released
    },
  }
);

module.exports = sequelize;
