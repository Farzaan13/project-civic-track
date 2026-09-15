# CivicTrack — Crowdsourced Civic Issue Reporting & Resolution System

SIH project: report civic issues (potholes, garbage, streetlights, water leaks, etc.) with photo + map pin, track resolution status, and let municipal staff manage them by department.

## Setup (Windows / PowerShell)

1. **Install dependencies**
   ```
   cd civic-issue-system
   npm install
   ```

2. **Create your `.env` file**
   Copy `.env.example` to `.env` and fill in real values:
   ```
   copy .env.example .env
   ```
   - `MONGO_URI` — local MongoDB (`mongodb://127.0.0.1:27017/civic-issue-system`) is fine for dev
   - `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` — free at [cloudinary.com](https://cloudinary.com)
   - `HUGGINGFACE_API_KEY` — free at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) (optional — app works fine without it, AI category suggestion just gets skipped)
   - `JWT_SECRET`, `SESSION_SECRET` — any random string

3. **Start MongoDB** (if running locally)
   ```
   mongod
   ```

4. **Seed departments + demo admin/staff accounts**
   ```
   npm run seed
   ```
   This creates:
   - Admin: `admin@civictrack.com` / `admin123`
   - Staff: `staff@civictrack.com` / `staff123`

5. **Run the app**
   ```
   npm run dev
   ```
   Visit `http://localhost:8080`

## How the core features work

- **Reporting**: `/issues/new` — click the map to pin a location, upload up to 3 photos, pick a category. Server tries Hugging Face image classification (non-blocking) and stores the AI's suggested category alongside your chosen one.
- **Duplicate detection**: on submit, the server checks for existing unresolved issues of the same category within 50 meters (`utils/duplicateDetection.js`, MongoDB `2dsphere` geo query). If found, your report doesn't create a new card — it upvotes the existing one instead.
- **Priority scoring**: `calculatePriority()` in `controllers/issueController.js` — severe categories (water/electricity/road damage) start higher, and upvote count bumps it further.
- **Department routing + SLA**: each `Department` document lists which categories it owns (`init/index.js`). New issues auto-assign to the matching department with a deadline based on that department's `slaHours`.
- **Status flow**: `reported → acknowledged → in_progress → resolved` (or `rejected`), changed from the admin dashboard, logged in `statusHistory` for the timeline UI.
- **Roles**: `citizen` (default on signup), `staff` (assigned to one department, sees only that department's issues), `admin` (sees everything, assigns staff, views analytics). Staff/admin accounts aren't self-service — create them by editing `init/index.js` or directly in MongoDB.

## Project structure

```
civic-issue-system/
├── app.js                 ← entry point
├── config/                ← db.js, cloudinary.js
├── models/                ← User, Issue, Department, Notification
├── controllers/           ← auth, issue, admin logic
├── routes/                ← authRoutes, issueRoutes, adminRoutes
├── middleware/             ← auth.js (JWT), roleCheck.js
├── utils/                  ← duplicateDetection.js, imageClassifier.js
├── views/                  ← EJS templates (ejs-mate layout)
├── public/css/style.css    ← all styling
├── public/js/              ← map.js + page-specific map init scripts
└── init/index.js           ← seed departments + demo users
```

## Next steps / stretch ideas

- Email/SMS notifications on status change (Nodemailer is already a dependency, just needs wiring in `adminController.updateStatus`)
- Auto-escalation cron job for overdue SLAs
- Citizen-facing "my reports" page
