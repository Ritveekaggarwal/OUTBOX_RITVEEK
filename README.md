# ReachInbox: Full-stack Email Job Scheduler

A production-style email scheduler: an API takes campaigns, **BullMQ delayed jobs** (no cron) send each email at the right time through **Ethereal SMTP**, and hourly limits are enforced per sender, per campaign and globally with Redis counters. A React dashboard built from the Figma file lets you log in with Google, compose campaigns from a CSV of leads, and track scheduled and sent emails live.

```
OUTBOX_RITVEEK/
├── docker-compose.yml          Postgres 16 · Redis 7 (AOF) · Elasticsearch 8
├── backend/                    npm workspaces, 3 deployable services + shared lib
│   ├── shared/                 config, Prisma models, repositories, queues, rate limiter, search
│   │   ├── prisma/schema.prisma
│   │   └── src/{config,lib,models,queues,rate-limit,search}
│   └── services/
│       ├── api-service/        Express REST API · Swagger · Bull Board · OAuth
│       │   └── src/{routes,controllers,services,middlewares,validators,docs,admin}
│       ├── email-worker/       BullMQ consumer: rate limit → claim → SMTP send
│       │   └── src/{processors,services}
│       └── notification-service/  BullMQ consumer: Slack alerts
└── frontend/                   React 18 · Vite · TypeScript · Tailwind · TanStack Query · Tiptap
    └── src/{api,components/{ui,icons,layout,emails,compose,auth},context,hooks,pages,types,utils}
```

## Tech stack

| Layer | Choice |
| --- | --- |
| API | TypeScript, Express 4, Zod validation, Helmet, CORS, Redis-backed request rate limiting |
| Queue | BullMQ 5 on Redis 7 (AOF persistence, `noeviction`) |
| Database | PostgreSQL 16 via Prisma ORM |
| Search | Elasticsearch 8 (Postgres fallback if ES is down) |
| Email | Nodemailer + Ethereal SMTP (accounts auto-created) |
| Auth | Google OAuth 2.0 (authorization code + ID token verification), email/password (bcrypt), JWT in httpOnly cookie |
| Alerts | Slack OAuth v2 (`incoming-webhook`) |
| Docs / ops | Swagger UI at `/api/docs`, Bull Board at `/admin/queues` |
| Frontend | React 18, Vite 6, Tailwind 3, React Router 6, TanStack Query 5, Tiptap editor, DOMPurify |

---

## 1. Credentials you need to add

`backend/.env` has already been generated from `backend/.env.example` with real random values for `JWT_SECRET`, `ENCRYPTION_KEY` and `BULL_BOARD_PASSWORD`. Database, Redis and Elasticsearch values match `docker-compose.yml`. Ethereal SMTP accounts are created automatically on first start. You only need to add two things:

### Google OAuth (required for "Login with Google")
1. Open https://console.cloud.google.com/apis/credentials. Create a project if you don't have one.
2. Configure the **OAuth consent screen**: External, then add your Gmail address as a test user.
3. Go to **Create credentials → OAuth client ID → Web application**.
4. Under **Authorized redirect URIs**, add `http://localhost:4000/api/auth/google/callback`.
5. Put the values in `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
   ```

### Slack (required for rate-limit alerts)
Slack only accepts **HTTPS** redirect URLs. You don't need a tunnel for this: the OAuth redirect happens in your own browser, so in development the API also listens on **https://localhost:4443** with a self-signed certificate. The certificate is generated once into `backend/.certs/` (`LOCAL_HTTPS_PORT=4443`).

1. Go to https://api.slack.com/apps → **Create New App** → **From scratch**.
2. Under **OAuth & Permissions → Redirect URLs**, add `https://localhost:4443/api/slack/oauth/callback`.
3. Under **OAuth & Permissions → Scopes → Bot Token Scopes**, add `incoming-webhook`.
4. Copy the values from **Basic Information → App Credentials** into `backend/.env`:
   ```
   SLACK_CLIENT_ID=1234567890.1234567890
   SLACK_CLIENT_SECRET=xxxxxxxxxxxxxxxx
   SLACK_REDIRECT_URI=https://localhost:4443/api/slack/oauth/callback
   LOCAL_HTTPS_PORT=4443
   ```
5. One-time step: open https://localhost:4443/api/health and accept the certificate warning (**Advanced → Proceed to localhost**). The browser remembers it.

The tunnel-free setup works because only the OAuth *redirect* needs HTTPS. Alerts are outgoing calls from the server to Slack's webhook, so nothing has to reach your machine from the internet.

Optional: pin your own Ethereal accounts (create them at https://ethereal.email/create) with `ETHEREAL_SENDERS=user1@ethereal.email:pass1,user2@ethereal.email:pass2`.

Without Google or Slack credentials the app still runs. Email/password login works, and the Google and Slack buttons return a clear "not configured" message.

---

## 2. How to run

Prerequisites: Node 20+ and Docker Desktop (running).

```bash
# 1. Infrastructure
docker compose up -d

# 2. Backend
cd backend
npm install
npm run db:deploy          # applies Prisma migrations
npm run dev                # starts api-service, email-worker, notification-service

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

| URL | What |
| --- | --- |
| http://localhost:5173 | Dashboard |
| http://localhost:4000/api/docs | Swagger API docs |
| http://localhost:4000/admin/queues | Bull Board (user `admin`, password = `BULL_BOARD_PASSWORD` in `.env`) |
| http://localhost:4000/api/health | Health check |

Production build: `cd backend && npm run build && npm start`, then `cd frontend && npm run build`.

---

## 3. Architecture

```
React (5173) ──/api proxy──▶ api-service (4000) ──▶ Postgres (source of truth)
                                   │  addBulk(delayed jobs, jobId = emailId)
                                   ▼
                              Redis / BullMQ ◀── email-worker ×N ──SMTP──▶ Ethereal
                                   │                   │
                                   │ notifications     └──▶ Elasticsearch (search read model)
                                   ▼
                          notification-service ──webhook──▶ Slack
```

Each service is built from routes → controllers → services → repositories (models). Dependencies point inwards through interfaces (`EmailScheduler`, `Mailer`), and the `container.ts` composition root is the only place where concrete classes are wired together.

### How scheduling works
1. `POST /api/emails/schedule` validates input (Zod), de-duplicates recipients and computes `scheduledAt = startAt + i × delay`.
2. The campaign and all email rows are written in **one Postgres transaction**, inserted in chunks of 1,000.
3. One **BullMQ delayed job** is added per email (`addBulk`, chunks of 500). `jobId = email.id`.
4. Documents are bulk-indexed into Elasticsearch in the background.

### How persistence on restart is handled
- Delayed jobs live in Redis, which runs with **AOF persistence**, so stopping the API or workers loses nothing. When a worker comes back, BullMQ promotes any overdue jobs immediately.
- Postgres is the source of truth. On startup, the worker runs a one-off **reconciler** (not a cron). It pages through rows still marked SCHEDULED, RATE_LIMITED or SENDING and re-adds any job missing from Redis. Because `jobId = email.id`, re-adding an existing job does nothing.
- **Idempotency.** Before sending, the worker runs an atomic `UPDATE … SET status='SENDING' WHERE status IN ('SCHEDULED','RATE_LIMITED')`. Only one worker can win that claim. Rows that are already SENT, CANCELLED or FAILED are skipped. A SENDING row older than 5 minutes (a crashed worker) can be reclaimed. The DB also has `UNIQUE(campaignId, recipient)`, and each message gets a stable `Message-ID`.
- On SIGINT/SIGTERM, every service shuts down gracefully: `worker.close()` lets active jobs finish first.

### How rate limiting and concurrency are implemented
| Concern | Implementation | Config |
| --- | --- | --- |
| Worker concurrency | `new Worker(..., { concurrency })`. Run more worker processes to scale out. | `WORKER_CONCURRENCY=5` |
| Delay between sends | BullMQ's **Redis-backed limiter** `{ max: 1, duration }` applies across every worker instance. Per-campaign spacing comes from scheduling times (the compose "Delay between 2 emails"). | `MIN_DELAY_BETWEEN_EMAILS_MS=2000` (min 2 s between any two sends) |
| Emails per hour | A Lua script checks the **global**, **per-sender** and **per-campaign** counters (`rl:count:{scope}:{id}:{hourWindow}`) and increments all of them only if every one has capacity. It is atomic, so it is safe across instances, and a rejected send never burns quota. | `MAX_EMAILS_PER_HOUR=500`, `MAX_EMAILS_PER_HOUR_PER_SENDER=200`, campaign limit from the form |
| When a limit is hit | The job is **moved to delayed, not failed**: `job.moveToDelayed(nextWindowStart + slot × spacing)` + `DelayedError`. Slots come from a per-scope Redis `INCR`, so jobs keep FIFO order in the next window. The row becomes RATE_LIMITED with its new time. | n/a |
| Slack alert | The first time a scope hits its limit in a window, a `SET NX` key dedupes the alert and a job is queued on `notifications`. The notification service looks up the user's Slack webhook **on every alert**, so connecting Slack takes effect without a redeploy. If Slack isn't connected, the alert is skipped and nothing crashes. A revoked webhook (403/404/410) is deleted. | n/a |
| SMTP failures | 3 attempts with exponential backoff (5s, 10s, 20s). After the last attempt the email is marked FAILED with its reason. | `EMAIL_MAX_ATTEMPTS=3` |

**Behaviour under load (1000+ emails at the same time):** the rows are inserted in chunks and the jobs bulk-added. Workers then pull jobs at `WORKER_CONCURRENCY`, but the global limiter caps throughput at one send per `MIN_DELAY_BETWEEN_EMAILS_MS`. Once an hourly cap is reached, the remaining jobs are pushed into later hour windows in order. Nothing is dropped and memory use stays flat, because jobs live in Redis rather than in process.

### Security
- JWT sessions live in **httpOnly, SameSite=Lax** cookies, with a Bearer header also accepted for Swagger and Postman.
- OAuth flows use a signed, 10-minute **state** token. Google's state is also pinned in a cookie, and the Google ID token is verified.
- SMTP passwords and Slack webhooks are encrypted at rest with **AES-256-GCM**.
- Passwords are hashed with bcrypt (12 rounds), and login runs in constant time for unknown emails.
- Helmet sets security headers, and CORS is locked to `FRONTEND_URL`. Requests are rate-limited per IP through Redis (300/min, and 10/min on auth endpoints).
- All input is validated with Zod and the JSON body is capped at 2 MB. Email HTML is sanitised with DOMPurify before rendering.
- Bull Board is behind HTTP basic auth with a timing-safe comparison, and secrets are redacted from logs.

---

## 4. Features

**Backend:** delayed-job scheduler (no cron) · persistence across restarts plus a startup reconciler · idempotent sends · worker concurrency · global throttle · global, per-sender and per-campaign hourly limits with in-order deferral · multiple Ethereal senders · Elasticsearch full-text search · Bull Board · Swagger · Google OAuth and email login · Slack OAuth with live alerts · health check · graceful shutdown.

**Frontend:** Google login page (Figma) · sidebar with user card, Compose button and live counts · Scheduled and Sent lists with status pills, search, status filter, refresh, infinite scroll, skeleton loaders and empty states · email detail with Ethereal preview link and cancel · Compose screen (Figma) with sender picker, recipient chips, CSV/TXT lead upload with detected count, delay and hourly limit, rich-text editor, and a Send Later popover with presets · toasts · Slack connect/test/disconnect · 5-second live refresh.

Small additions beyond the Figma: a sign-up toggle on the login page, a "throttled" banner in the sidebar, a status filter, an Ethereal preview link, and star / cancel actions.

## 5. API quick test (Postman / curl)

```bash
# login, then use the returned token as a Bearer token
curl -X POST localhost:4000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Demo","email":"demo@example.com","password":"demo12345"}'
curl localhost:4000/api/senders -H "Authorization: Bearer <token>"
curl -X POST localhost:4000/api/emails/schedule -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"senderId":"<id>","subject":"Hello","body":"<p>Hi!</p>","recipients":["a@example.com","b@example.com"],"startAt":"2030-01-01T10:00:00Z","delayBetweenEmailsSeconds":2,"hourlyLimit":100}'
```

## 6. Assumptions and trade-offs
- Elasticsearch is a read model, so indexing is best-effort. Search falls back to Postgres `ILIKE` when ES is unreachable.
- Quota is consumed when a send is attempted. A send that ultimately fails still counts toward the hour, which is the conservative choice for provider limits.
- Ethereal never delivers real mail. Every sent email gets a "View in Ethereal" preview link.
- Attachments are not sent. The paperclip icon in Compose attaches a **lead list** instead.
- Times are entered in the browser's local timezone and stored in UTC.
