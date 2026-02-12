# SmartPOS MERN Application

Full-stack MERN POS system built in this main directory with dynamic API-backed content and modular architecture.

The UI direction is based on the provided SmartPOS design templates inside `MERNPOS/*/code.html`.

## Stack

- MongoDB + Mongoose
- Express.js (REST API)
- React + React Router + Vite
- Node.js

## Architecture

### Backend (`server`)

- `src/config`: environment and database setup
- `src/models`: Mongoose models (`Category`, `Product`, `Customer`, `Sale`, `User`)
- `src/services`: dashboard/report aggregation logic
- `src/controllers`: request handlers
- `src/routes`: API route modules
- `src/middleware`: centralized error handlers
- `src/seed/seed.js`: demo data script

### Frontend (`client`)

- `src/components/layout`: app shell (sidebar/topbar)
- `src/components/ui`: reusable UI blocks
- `src/pages`: route-level features (Dashboard, Inventory, Categories, Customers, POS, Reports, Login)
- `src/api/http.js`: API client layer
- `src/styles/index.css`: SmartPOS design system styles

## Dynamic Features

- Login with seeded admin user
- Dashboard KPIs, weekly sales chart, recent sales, top products
- Category management (create/delete)
- Product and inventory management (create/list/filter/delete)
- Customer management (create/list/delete)
- POS checkout flow:
  - product search/filter
  - cart and quantity handling
  - payment type and optional customer selection
  - creates sale records and decrements stock
- Reports and analytics:
  - revenue/order summary
  - payment method breakdown
  - category performance
  - daily revenue trend

## Quick Start

1. Install dependencies:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

2. Copy environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

For PowerShell:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

3. Start MongoDB locally.

4. Seed demo data:

```bash
npm run seed
```

5. Run both frontend and backend:

```bash
npm run dev
```

## Default Login

- Email: `admin@smartpos.local`
- Password: `admin123`

## API Base

- Backend: `http://localhost:5000`
- API root: `http://localhost:5000/api`
- Frontend: `http://localhost:5173`
