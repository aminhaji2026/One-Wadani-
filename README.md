# Waddani Party Operations & Support Platform

Full-stack starter covering 10 integrated modules:

1. Organisation & Worldwide Office Management  
2. Membership & Digital Membership Cards  
3. Global Supporter Registration & Consent Management  
4. Staff, Officials & Volunteer Management  
5. Fundraising, Donations & Payment Integration  
6. Financial Management, Budgets & Reconciliation  
7. Communications, Media, Videos & Public Campaign Management  
8. Events, Meetings, Tasks & Internal Collaboration  
9. Analytics & Leadership Command Centre  
10. Security, Permissions, Audit & Data Protection  

## Important design principle

Political-affiliation data is sensitive. The code intentionally avoids clan profiling, covert political persuasion scoring, and sensitive micro-targeting. Supporter communications require explicit consent, and access is role-based and office-scoped where applicable.

## Quick start

```bash
cp .env.example .env
# Set a strong JWT_SECRET (16+ characters) before starting the API.
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:4000  

Seeded administrator:

- Email: `admin@waddani.local`
- Password: `ChangeMe123!`

The seeded admin is marked `mustChangePassword`. Change the password and JWT secret before any shared or production deployment.

## Docker

```bash
cp .env.example .env
# Ensure JWT_SECRET is set in the environment / .env
docker compose up --build
```

- Web: http://localhost:8080  
- API: http://localhost:4000  

Compose waits for Postgres health, runs Prisma migrations on API boot, and builds the web app with `VITE_API_URL` as a build argument.

## What is implemented

- Auth with JWT, login rate limiting, forced password change, and stronger JWT boot checks
- Office-scoped list/create flows for members, supporters, staff, finance, events, and fundraising
- Sequential ID counters for membership, staff, and donation receipts
- Approval and rejection flows for fundraising, expenses, and communications
- Consent checkboxes for supporters; privacy request completion workflow
- Member search/activate and donations + budgets screens
- Mock payments that auto-confirm only outside production; production mock webhooks require `MOCK_WEBHOOK_SECRET`
- Dashboard/analytics charts (lazy-loaded) and operational UI for events, tasks, staff/volunteers
- Unit tests, API smoke script, and GitHub Actions CI with Postgres

## Scripts

```bash
npm run build
npm run test
npm run test:smoke   # requires API running
```

## Payments

`apps/api/src/services/payments.ts` provides an adapter layer with mock implementations and placeholders for ZAAD. Do not put production payment credentials in source control. Implement provider-specific signing, webhook verification, and merchant onboarding before accepting real funds.

## Security checklist before production

- Replace seed credentials and JWT secret.
- Enable HTTPS/TLS at the ingress/load balancer.
- Add MFA for all staff accounts.
- Add WAF and anomaly monitoring.
- Configure encrypted backups and disaster recovery.
- Run dependency, SAST/DAST and penetration tests.
- Establish retention/deletion rules for supporter/member data.
- Obtain legal review for political donations and data processing in each operating jurisdiction.
