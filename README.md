# Waddani Party Operations & Support Platform

Public party website (Join / Donate / Take action) plus a staff operations console, restyled after democrats.org and labour.org.uk with Waddani orange branding.

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
Political-affiliation data is sensitive. The code intentionally avoids clan profiling, covert political persuasion scoring, and sensitive micro-targeting. Supporter communications require consent, and access is role-based.

## Quick start

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Web: http://localhost:5173  
Public site: `/` · Join: `/join` · Donate: `/donate` · Staff login: `/login` · Console: `/console`  
API: http://localhost:4000

Seeded administrator:

- Email: `admin@waddani.local`
- Password: `ChangeMe123!`

Change the password and JWT secret before any real deployment.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Web: http://localhost:8080

## Payments

`apps/api/src/services/payments.ts` provides an adapter layer with mock implementations and placeholders for ZAAD and an international gateway. Do not put production payment credentials in source control. Implement provider-specific signing, webhook verification and merchant onboarding before accepting real funds.

## Security checklist before production

- Replace seed credentials and JWT secret.
- Enable HTTPS/TLS at the ingress/load balancer.
- Add MFA for all staff accounts.
- Add rate limits, WAF and anomaly monitoring.
- Configure encrypted backups and disaster recovery.
- Run dependency, SAST/DAST and penetration tests.
- Establish retention/deletion rules for supporter/member data.
- Obtain legal review for political donations and data processing in each operating jurisdiction.
