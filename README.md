<div align="center">

# Vyral 🇮🇳

### India's Creator OS — Write once. Reach Bharat.

One idea → 6 platforms, AI-adapted in your voice, in your language.

[![CI](https://github.com/your-username/vyral/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/vyral/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Made in India](https://img.shields.io/badge/Made%20in-Bharat%20🇮🇳-FF9933)](https://vyral.in)

[**Live Demo**](https://vyral.in) · [**Docs**](https://docs.vyral.in) · [**Report Bug**](https://github.com/your-username/vyral/issues)

</div>

---

## What is Vyral?

Vyral is an **AI-powered social media OS built for Indian creators and brands**. Write your idea once — Vyral adapts it for Instagram, Twitter/X, LinkedIn, YouTube, Facebook, and WhatsApp in your tone, format, and language.

**Why India-first**: Analytics in lakh/crore notation · ₹-native Razorpay payments · WhatsApp Broadcast as first-class channel · 7 regional languages · IST-calibrated optimal posting times

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Database | PostgreSQL + Prisma |
| Auth | NextAuth.js v4 (Google OAuth) |
| AI | Anthropic Claude |
| Queue | BullMQ + Redis |
| Payments | Razorpay (INR-native) |
| Styling | Tailwind CSS |

---

## Quick Start

```bash
git clone https://github.com/your-username/vyral.git
cd vyral
bash setup.sh
```

Then fill in `.env.local` and run `npm run dev` → http://localhost:3000

---

## Key Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL (Supabase/Neon) |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | ✅ | Claude API |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth login |
| `TOKEN_ENCRYPTION_KEY` | ✅ | `openssl rand -hex 32` |
| `RAZORPAY_KEY_ID` | Payments | Razorpay dashboard |
| `META_APP_ID` | Instagram | Meta for Developers |
| `TWITTER_CLIENT_ID` | Twitter | developer.twitter.com |
| `LINKEDIN_CLIENT_ID` | LinkedIn | developer.linkedin.com |

See [`.env.example`](.env.example) for the full documented list.

---

## Project Structure

```
vyral/
├── prisma/schema.prisma       # 10 DB models
├── src/
│   ├── app/api/
│   │   ├── ai/generate/       # Claude content generation
│   │   ├── posts/             # CRUD + BullMQ scheduling
│   │   ├── analytics/         # Cross-platform metrics
│   │   ├── platforms/         # Instagram/Twitter/LinkedIn OAuth
│   │   └── payments/          # Razorpay INR billing
│   ├── lib/
│   │   ├── ai/generate.ts     # Claude adapter
│   │   ├── social/publisher.ts # Posts to each platform API
│   │   ├── tokens/encrypt.ts  # AES-256-GCM token storage
│   │   ├── tokens/refresh.ts  # Auto token refresh
│   │   └── queue/index.ts     # BullMQ publish queue
│   └── components/
│       └── platforms/         # Connect/disconnect UI
├── setup.sh                   # One-command setup
├── OAUTH_SETUP.md             # Platform OAuth guide
└── CONTRIBUTING.md            # Branch strategy
```

---

## Roadmap

- [x] Next.js scaffold + Prisma schema
- [x] NextAuth Google OAuth
- [x] Claude AI content generation
- [x] Instagram / Twitter / LinkedIn OAuth
- [x] AES-256 token encryption + auto-refresh
- [x] Razorpay payment integration
- [ ] BullMQ publish worker
- [ ] Analytics cron jobs
- [ ] Onboarding flow
- [ ] Landing page
- [ ] YouTube + WhatsApp
- [ ] Mobile app

---

## Pricing

| Plan | Price | Posts/mo | AI Credits |
|---|---|---|---|
| Free | ₹0 | 10 | 50 |
| Creator | ₹799/mo | 100 | 500 |
| Pro | ₹1,999/mo | 500 | 2,000 |
| Agency | ₹4,999/mo | Unlimited | 5,000 |

---

MIT © 2025 Vyral — Built with ❤️ in Bharat 🇮🇳
