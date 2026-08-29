# Reslv

### A Unified Customer Support and Sprint Management Platform

![Stack](https://img.shields.io/badge/Stack-MERN-61DAFB?style=flat-square)
![Mobile](https://img.shields.io/badge/Mobile-React%20Native-2E7D32?style=flat-square)
![Status](https://img.shields.io/badge/Status-In%20Development-80A8FF?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-CEB5FF?style=flat-square)

Reslv merges customer support ticketing and software engineering sprint planning into a single continuous system, instead of the two disconnected tools (e.g. Zendesk + Jira) most companies stitch together. Every ticket a customer files and every task an engineer completes flows through one pipeline, one prioritization model, and one measure of work: sprint hours.

---

## Table of Contents

- [Overview](#overview)
- [Why Reslv](#why-reslv)
- [User Roles](#user-roles)
- [Features by Module](#features-by-module)
- [Tech Stack](#tech-stack)
- [External APIs](#external-apis)
- [Design System](#design-system)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Business Model](#business-model)
- [Team](#team)
- [License](#license)

---

## Overview

Support agents and engineers usually work in separate tools, and the handoff between "customer reports a bug" and "engineer fixes it" is where context, accountability, and revenue leak. Reslv treats that handoff as one continuous flow: a ticket can be escalated through a defined chain, promoted into a sprint task with a permanent two-way link, and traced all the way to the customer being notified when it ships — all while every minute of work, support or engineering, counts toward the same sprint-hour total.

## Why Reslv

**Core differentiators that set it apart from Jira, Redmine, and Zendesk:**

- **Unified Sprint-Hour Model** — every completed sprint task _and_ every resolved support ticket adds to the same team member's sprint-hour total, so support and engineering work are measured on one scale.
- **Emergency Work Handoff with Hour Transfer** — a member can pass assigned work to a colleague in an emergency; sprint hours are deducted from the original member and credited to the receiver.
- **Ticket Delegation Chain** — `Support Agent → Admin → Team Lead → Team Member`, with every handoff timestamped and logged.
- **Revenue-Weighted Prioritization & Dollar-Traced Engineering** — the backlog auto-ranks by the business impact (contract value, churn risk) of the customers affected, and a single unit of money can be traced from customer → ticket → task → commit → back to the customer.
- **Bidirectional Ticket ↔ Task Link** — promoting a ticket to an engineering task creates a permanent two-way link; the customer is notified automatically the moment the fix ships.

## User Roles

| Role                       | Responsibilities                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Admin**                   | Verifies accounts, monitors the system, configures SLA/prioritization/subscription parameters, routes escalated tickets to team leads. |
| **Support Agent**           | Creates and manages tickets, chats with customers, escalates unsolved tickets to admin.                                                |
| **Team Lead**                | Receives escalated tickets from admin, assigns them to team members, monitors team sprint progress.                                    |
| **Engineering Team Member** | Manages backlog, works sprint tasks, logs time, receives assigned/escalated tickets, may hand off work in emergencies.                 |

## Features by Module

### Module 1 — Support & Ticket Management

- Multi-channel ticket dashboard
- Direct real-time customer chat
- Ticket escalation & delegation chain
- Customer & contract profile management

### Module 2 — Sprint Planning & Hour Tracking

- Sprint setup with task-hour assignment
- Unified sprint-hour counting (tasks + tickets)
- Emergency work handoff with hour transfer
- Backlog & board management (Scrum board, story points, calendar-aware capacity)

### Module 3 — Intelligence, AI & Analytics

- Customer-facing AI chatbot (self-service, hands off to a live agent)
- Engineering & sprint analytics dashboards
- Revenue-weighted prioritization & Dollar-Traced Engineering
- Review & feedback system (1–5 star ratings)

### Module 4 — Notifications, Payments & Admin

- Automated notifications & alerts (email + real-time)
- Subscription & payment system (Free / Premium, billed per user)
- Loyalty / reward points system
- Admin configuration & system monitoring panel

## Tech Stack

| Layer            | Technology                |
| ----------------- | -------------------------- |
| Web Frontend     | React.js, TailwindCSS      |
| Mobile Frontend  | React Native (Android)     |
| Backend          | Node.js, Express.js        |
| Database         | MongoDB                    |
| Stack Family     | MERN                       |
| Deployment       | Render                     |

## External APIs

| API                    | Purpose                                                     |
| ----------------------- | ------------------------------------------------------------- |
| Payment Gateway API     | Subscription billing                                          |
| Mail & OTP API          | Email notifications + OTP verification                        |
| Notification API        | Real-time alerts / push notifications                         |
| Calendar API             | Availability-aware sprint capacity planning                    |
| Google Gemini API        | Customer-facing AI chatbot + self-service support assistant   |

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- MongoDB (local or Atlas)

## Environment Variables

Create a `.env` file in `/reslv_server_side` with the following:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# Google Calendar API
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER_MONTHLY=
STRIPE_PRICE_STARTER_YEARLY=
STRIPE_PRICE_PROFESSIONAL_MONTHLY=
STRIPE_PRICE_PROFESSIONAL_YEARLY=
STRIPE_PRICE_ENTERPRISE_MONTHLY=
STRIPE_PRICE_ENTERPRISE_YEARLY=
# Run node scripts/setupStripePrices.js to generate the 6 price IDs above.

# External APIs
PAYMENT_GATEWAY_API_KEY=
MAIL_API_KEY=
OTP_API_KEY=
NOTIFICATION_API_KEY=
CALENDAR_API_KEY=

# Google Gemini (customer-facing AI chatbot)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
```

## Roadmap

- [x] Functional requirements documentation (4 modules)
- [x] UI design system & Figma mockup (Ticket Inbox)
- [x] Backend API (auth, tickets, sprints)
- [x] Web frontend (support & sprint dashboards)
- [ ] Mobile app (React Native)
- [x] AI chatbot integration
- [ ] Payment & subscription integration
- [ ] Deployment

## Business Model

Reslv is offered as a subscription (SaaS), billed per user per month or per year, across three tiers:

| Tier         | Includes                                                                          |
| ------------- | ------------------------------------------------------------------------------------ |
| **Starter**      | Ticketing, basic board, ticket↔task bridge                                         |
| **Professional** | + Revenue-weighted prioritization, reporting                                        |
| **Enterprise**   | + Dollar-Traced Engineering, SLA forecasting, custom security                       |

## Team

**BRAC University — CSE471: System Analysis and Design**
Group 01, Lab Section 02, Summer 2026

| ID       | Name                        |
| -------- | --------------------------- |
| 22299079 | MD. Sohanur Rahman Shimul   |
| 22201411 | Moutmayen Nafis              |
| 23101146 | Sahriar Mahbub Sazid         |

## License

This project is licensed under the MIT License.
