# Contributing to Vyral

## Branch Strategy

```
main          ← production (protected, only merges from dev)
dev           ← staging / integration branch
feature/*     ← new features  e.g. feature/whatsapp-oauth
fix/*         ← bug fixes     e.g. fix/token-refresh-crash
chore/*       ← tooling       e.g. chore/upgrade-prisma
```

## Workflow

```bash
# 1. Branch off dev
git checkout dev
git pull origin dev
git checkout -b feature/your-feature

# 2. Build & commit
git add .
git commit -m "feat: add WhatsApp OAuth flow"

# 3. Push & open PR → dev
git push origin feature/your-feature
# Open PR on GitHub targeting dev
```

## Commit Message Format

```
feat:   new feature
fix:    bug fix
chore:  tooling, deps, config
docs:   documentation only
style:  formatting (no logic change)
refact: refactor (no behaviour change)
test:   adding or updating tests
```

## Environment

Never commit `.env.local`. All secrets go there. `.env.example` is the source of truth for what variables are needed.

## Database Changes

Always create a migration instead of pushing directly in production:
```bash
npm run db:migrate   # creates migration file + applies
npm run db:generate  # regenerates Prisma client
```
