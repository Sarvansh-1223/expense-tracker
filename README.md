# Ledger — Monthly Expense Tracker

A full-stack personal finance application: Django REST Framework backend
(SQLite3, JWT auth) + React/Vite frontend. Tracks expenses, income, budgets,
and recurring bills, with a dashboard, analytics, and calendar view built
entirely on real data from the database — nothing is hardcoded or mocked.

```
expense-tracker/
├── backend/     Django + DRF API (SQLite3, JWT)
└── frontend/    React + Vite dashboard
```

## Tech stack

**Backend:** Python, Django, Django REST Framework, SQLite3 (Django default),
SimpleJWT, django-cors-headers, django-filter.

**Frontend:** React, Vite, JavaScript, Axios, React Router, Recharts,
Lucide icons.

No Docker, no Postgres/Mongo/Firebase — SQLite3 only, as requested.

---

## 1. Backend setup

```bash
cd backend
python -m venv venv

# Linux/macOS
source venv/bin/activate
# Windows
venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# edit .env if you want to change the secret key, timezone, or CORS origins

python manage.py migrate
python manage.py createsuperuser        # optional, for /admin/

# Optional: generate realistic demo data (creates user demo / demopass123)
python manage.py seed_data

# Materialize any due recurring transactions
python manage.py process_recurring_expenses

python manage.py runserver
```

The API is now running at `http://localhost:8000/api/`.

### Keeping recurring expenses up to date

`process_recurring_expenses` is idempotent — running it twice never creates
duplicate transactions, because each rule's `next_due_date` is advanced and
saved the moment a transaction is generated for it. In addition to running it
manually, it's called automatically:

- Every time a user loads the dashboard (`GET /api/dashboard/`)
- Via `POST /api/recurring-expenses/process/`

For a production deployment, also schedule the management command to run
daily (cron, Windows Task Scheduler, or a hosting platform's scheduled jobs)
so recurring expenses are created even if nobody opens the dashboard that day:

```bash
# crontab -e
0 1 * * * cd /path/to/backend && venv/bin/python manage.py process_recurring_expenses
```

### Running backend tests

```bash
python manage.py test
```

18 tests cover registration/login, JWT auth, expense/income/budget CRUD,
validation (negative amounts, future dates, negative budgets), user data
isolation (401/404 on other users' data), dashboard math, and recurring
expense processing (including duplicate prevention).

---

## 2. Frontend setup

```bash
cd frontend
npm install

cp .env.example .env
# defaults to http://localhost:8000/api — change VITE_API_URL if needed

npm run dev
```

The app is now running at `http://localhost:5173`.

Log in with the seeded demo account (`demo` / `demopass123`), or register a
new account from the app itself.

### How the frontend talks to the backend

`src/services/api.js` wraps Axios with an interceptor that attaches the JWT
access token to every request and automatically refreshes it using the
refresh token on a 401, retrying the original request transparently. All
resource-specific calls live in `src/services/resources.js`.

### Production build

```bash
npm run build
```

Outputs a static bundle to `frontend/dist/`, which can be served by any
static host (Nginx, Vercel, Netlify, etc.) as long as `VITE_API_URL` points
at your deployed Django API.

---

## 3. What's included

- **Auth:** register, login, logout, JWT access/refresh, protected endpoints,
  every financial record scoped to the authenticated user (verified by tests).
- **Dashboard:** income/expenses/balance/savings/budget summary cards,
  automatically generated warnings (budget exceeded/near limit, spending
  trend vs. last month) and insights (top category, average daily spend,
  projected overspend), recent transactions, upcoming recurring expenses,
  category budget progress bars.
- **Transactions:** full CRUD, search, filter (category/payment
  method/date range), sort, pagination, CSV export.
- **Income:** full CRUD, monthly totals, filtered by month.
- **Budgets:** overall monthly budget + per-category budgets with progress
  bars and exceeded/near-limit states.
- **Recurring expenses:** daily/weekly/monthly/yearly frequencies, automatic
  transaction generation via `process_recurring_expenses`, pause/resume,
  duplicate-proof by design.
- **Analytics:** category breakdown (donut chart), income vs. expenses
  (bar chart), daily spending (line chart), monthly savings trend, and the
  same auto-generated insights as the dashboard.
- **Calendar:** month grid with per-day spending and a heat-style intensity
  indicator; click a day to see its transactions.
- **Settings:** profile info, custom category management (add/delete),
  light/dark theme toggle (persisted).
- **Custom categories:** 14 defaults seeded per user, plus user-defined ones.
- **Validation & errors:** positive amounts, no future-dated expenses,
  non-negative budgets, friendly 400/401/404 handling throughout.
- **Responsive & dark mode:** sidebar collapses into a mobile menu below
  900px; theme preference persists in `localStorage`.

## 4. Default categories

Food, Groceries, Transportation, Shopping, Entertainment, Bills, Rent,
Education, Healthcare, Travel, Subscriptions, Utilities, Personal, Other —
seeded automatically the first time a user loads the dashboard or accesses
categories. Users can add their own from Settings.

## 5. Notes on architecture

Business logic (dashboard math, warnings, insights, chart aggregation,
recurring-expense processing) lives in `backend/finance/services.py`, kept
separate from views and serializers per the "fat services, thin views"
pattern. Every queryset in the API is scoped to `request.user` through a
shared `UserScopedViewSet` base class, so cross-user data access isn't
possible even by ID guessing (covered by tests).
