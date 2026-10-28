# FairShift

Hackathon prototype: a mobile-friendly workforce fairness app for **construction sites** and **college support staff**.
Workers see shifts, hours and a pay breakdown (with overtime explained), send safety/workplace reports (optionally without their name) and track their status.
Admins see attendance, hours, overtime, alerts and open reports, filter by industry/worksite, and change report statuses, which workers then see.

All data is **fictional and in memory**. No real employee data, no credentials, no external services.

## Run locally
Requires Node 18+. There are no dependencies to install.
```bash
npm start            # or: node server.js
# open http://localhost:8080  (set PORT=3000 to change)
```
Docker (optional): `docker build -t fairshift . && docker run -p 8080:8080 fairshift`

## Demo profiles (choose in the Worker view)
| Profile | Industry / worksite | Why it is interesting |
|---|---|---|
| Ravi Kumar, Mason | Construction, Lakeview Towers | 60 h in 7 days: overtime + "Excessive hours" alert; open safety report R1 |
| Meena Selvam, Site Helper | Construction, Lakeview Towers | One absence |
| Arjun Das, Crane Signaller | Construction, Metro Depot | 54 h, resolved pay query |
| Selvi Murugan, Rebar Fixer | Construction, Metro Depot | 48 h, exactly at the overtime threshold |
| Lakshmi Devi, Housekeeping Supervisor | College, St. Anne's Facilities | 40 h, no overtime |
| Farah Khan, Campus Electrician | College, St. Anne's Facilities | 45 h (5 h overtime), one absence |
| Thomas Joseph, Night Security | College, St. Anne's Facilities | 55 h, "Excessive hours" alert |

There is no login: the Worker/Admin switch is a demo toggle.

## How pay and alerts work
- Hours are for the last 7 days. Construction sites: first 48 h at the normal rate, the rest at 2x. College: first 40 h, the rest at 1.5x. These are **demo rules, not legal advice**.
- "Excessive hours" alert: more than 54 h in 7 days, or any single day of 11 h or more.
- Safety alert: any safety report (Safety hazard, Unsafe equipment) not yet Resolved. It is "Act now" if still Submitted or 2+ days old.
- Attendance = days present / days scheduled.

## Voice and intro
- **Ask FairShift** card: say or tap "show my pay", "next shift", "report a problem", "open admin", "Tamil", "stop" (Tamil keywords: ஊதியம், பணிநேரம், புகார், நிர்வாகி).
- **Speak your report**: dictate into the report form; the category is guessed from keywords and can be changed.
- **Read aloud** buttons on shift, pay, reports and admin alerts; the speaker icon mutes confirmations.
- **Intro**: a live-drawn dawn-shift scene with a time-based greeting; Enter speaks a personal greeting. Drop `public/intro.mp4` (or edit the path in `playIntro`) to play your own video instead. It shows once per browser session; the play icon replays it.

## Architecture
- `server.js`: Node built-ins only (`http`). Holds fictional data in memory and serves a small JSON API plus the single page.
  `GET /api/meta`, `GET /api/worker/:id?mine=R4,R5`, `GET /api/admin?industry=&site=`, `POST /api/reports`, `PATCH /api/reports/:id`, `GET /healthz`.
- `public/index.html`: one-file vanilla JS/CSS UI (Worker and Admin views, ~8 s auto-refresh so admin changes show up for the worker).
- `Dockerfile`: `node:20-alpine`, non-root user, listens on `$PORT`.

## Deploy to Google Cloud Run
Prerequisites: a Google Cloud project with billing, and the `gcloud` CLI signed in (`gcloud auth login`).
```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
gcloud run deploy fairshift --source . --region asia-south1 \
  --allow-unauthenticated --max-instances 1 --memory 256Mi
```
The command prints the live `https://fairshift-...run.app` URL. `--max-instances 1` keeps the in-memory demo state consistent
for all visitors; state resets whenever the instance restarts or you redeploy.

## Deploy on Vercel
Import the repository and set the project root directory to `fairshift`, or run `vercel --prod` from this folder.
Vercel serves `public/` as the website and sends `/api/*` requests to the Node function in `api/[...path].mjs`.
This is a demo: report changes are kept in memory and may reset between function invocations or deployments.

## Limitations (honest list)
- No authentication or authorization: anyone with the URL can use the Admin view and change statuses. Do not put real data in it.
- No database: reports disappear on restart. Anonymous report numbers are sequential and kept in the browser's localStorage so the worker can track them.
- Only static UI headings are available in Tamil (a fixed dictionary); there is no automatic translation. Voice uses the browser's Web Speech API: speech recognition works in Chrome/Edge (audio is processed by the browser vendor's service, needs internet and HTTPS or localhost); read-aloud needs a voice for the language (Tamil voices must be installed on the device).
- No automated tests exist. Pay and alert rules are simple demo logic.
- Skill passport is read-only example data.

## Submission hygiene
Repo is well under 10 MB. Use one branch:
```bash
git init -b main && git add . && git commit -m "FairShift prototype" 
```
