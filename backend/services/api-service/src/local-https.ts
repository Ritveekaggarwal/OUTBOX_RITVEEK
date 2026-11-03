import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import type { Express } from 'express';
import selfsigned from 'selfsigned';
import type { Logger } from '@reachinbox/shared';

interface CertPair {
  key: string;
  cert: string;
}

const CERT_DIR = path.resolve(process.cwd(), '..', '..', '.certs');
const KEY_FILE = path.join(CERT_DIR, 'localhost-key.pem');
const CERT_FILE = path.join(CERT_DIR, 'localhost-cert.pem');

/** Generates a localhost certificate once and reuses it, so the browser exception is only accepted once. */
function loadOrCreateCertificate(logger: Logger): CertPair {
  if (fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE)) {
    return { key: fs.readFileSync(KEY_FILE, 'utf8'), cert: fs.readFileSync(CERT_FILE, 'utf8') };
  }
  const pems = selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
    days: 825,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      { name: 'basicConstraints', cA: false },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
        ],
      },
    ],
  });
  fs.mkdirSync(CERT_DIR, { recursive: true });
  fs.writeFileSync(KEY_FILE, pems.private, { mode: 0o600 });
  fs.writeFileSync(CERT_FILE, pems.cert);
  logger.info({ dir: CERT_DIR }, 'Generated local HTTPS certificate');
  return { key: pems.private, cert: pems.cert };
}

/**
 * Development-only HTTPS listener for OAuth callbacks that must be HTTPS
 * (Slack). It serves the same Express app, so no tunnel is required: the
 * OAuth redirect happens in the user's own browser, which can reach localhost.
 */
export function startLocalHttps(app: Express, port: number, logger: Logger): https.Server {
  const server = https.createServer(loadOrCreateCertificate(logger), app);
  server.listen(port, () => logger.info(`Local HTTPS on   https://localhost:${port} (for Slack OAuth)`));
  return server;
}
