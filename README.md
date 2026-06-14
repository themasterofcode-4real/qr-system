# QR Access Kiosk

## 1. Ambiguity Analysis
- Browser QR decoding normally requires a camera QR library; to preserve immediate Vercel compatibility and avoid native dependencies, this implementation includes live camera preview plus a manual/scanner-wedge QR input. Hardware QR scanners that type into the focused input are supported.
- Logs are encrypted client-side at rest in browser localStorage. Vercel serverless functions acknowledge log events but do not persist them because no external database was specified.
- Email is optional by environment. Missing SMTP settings never blocks kiosk operation.

## 2. Architecture
- Next.js App Router, React, TypeScript, Tailwind CSS, and shadcn/ui-style local primitives.
- Client kiosk state machine: HOME → SCANNING → LOCATION_SELECTION → PROCESSING → RESULT → RESET → HOME.
- Vercel-compatible API routes run on Node.js serverless runtime for diagnostics, email, and log acknowledgements.
- Browser APIs provide camera preview, speech synthesis, audio tones, local storage, and Web Crypto encryption.

## 3. Folder Structure
```text
app/                 Next.js app, pages, global CSS, serverless API routes
components/ui/       shadcn/ui-style reusable UI primitives
lib/                 kiosk rules, QR validation, audio, encrypted log helpers
.env.example         documented environment variables
README.md            setup, architecture, deployment, tests
```

## 4. Data Model
Users are keyed by internal QR name and contain name, numeric ID, role, and department. Access logs contain timestamp, event type, user identity fields, destination, result, reason, and details. Destinations are `LIVING_ROOM`, `BATHROOM`, `MASTER_BEDROOM`, `KITCHEN`, and `EXITING_HOUSE`.

## 5. API Design
- `POST /api/email`: sends a completed access attempt email through SMTP; returns HTTP 200 even when email is skipped or fails.
- `GET /api/diagnostics`: returns server-side diagnostic status for email configuration and the embedded user database.
- `POST /api/logs`: acknowledges client-encrypted local log events without requiring an external database.

## 6. Security Review
- Admin password is local to the kiosk UI per requirement. For shared production deployments, replace this with authenticated identity before exposing beyond a physical kiosk.
- Logs are encrypted at rest using AES-GCM via Web Crypto before storage in localStorage.
- SMTP secrets are only read in serverless API routes and are not exposed to the client.
- Email failures, camera failures, malformed QR input, speech failures, storage failures, and encryption failures are caught or isolated from the kiosk flow.

## 7. Acceptance Tests
1. Open the deployed site.
2. Confirm startup announces “QR Access Kiosk ready.”
3. Press **START SCAN**.
4. Enter or scan `ID:4|NAME:JOSEPHROYALTY`.
5. Confirm destination buttons appear.
6. Choose **BATHROOM**.
7. Confirm granted screen, success tone, speech, encrypted log, email request, and automatic reset.
8. Choose **KITCHEN** between 8 PM and 6 AM local time to confirm denial.
9. Log in to admin with `Joseph3136`, review logs and diagnostics, test email, toggle theme, and shutdown/reactivate.

## Setup
```bash
npm install
npm run build
npm run dev
```

## Deployment to Vercel
1. Import this repository in Vercel.
2. Add SMTP environment variables from `.env.example` if email delivery is required.
3. Deploy with the default Next.js framework preset.
4. Use HTTPS deployment URL so browser camera permissions work.

## Environment Variables
| Variable | Required | Description |
|---|---:|---|
| `SMTP_HOST` | No | SMTP server hostname. |
| `SMTP_PORT` | No | SMTP server port, defaults to `587`. |
| `SMTP_SECURE` | No | Set `true` for TLS-on-connect providers. |
| `SMTP_USER` | No | SMTP username. |
| `SMTP_PASS` | No | SMTP password or app password. |
| `EMAIL_FROM` | No | Sender address; defaults to `SMTP_USER`. |
| `EMAIL_TO` | No | Recipient for access attempt emails. |

## Vercel Compatibility Notes
- No Electron, Python, native services, long-running server processes, or filesystem persistence are used.
- API routes use serverless-compatible request handlers.
- Camera, speech, tones, and encryption are browser APIs available in modern browsers.
