#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Vyral — Setup Script
# Usage: bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

SAFFRON='\033[38;5;214m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

print_step() { echo -e "\n${SAFFRON}${BOLD}▶ $1${RESET}"; }
print_ok()   { echo -e "${GREEN}✓ $1${RESET}"; }
print_err()  { echo -e "${RED}✗ $1${RESET}"; exit 1; }

echo -e "\n${SAFFRON}${BOLD}"
echo "  ██╗   ██╗██╗   ██╗██████╗  █████╗ ██╗"
echo "  ██║   ██║╚██╗ ██╔╝██╔══██╗██╔══██╗██║"
echo "  ██║   ██║ ╚████╔╝ ██████╔╝███████║██║"
echo "  ╚██╗ ██╔╝  ╚██╔╝  ██╔══██╗██╔══██║██║"
echo "   ╚████╔╝    ██║   ██║  ██║██║  ██║███████╗"
echo "    ╚═══╝     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝"
echo -e "${RESET}"
echo -e "  India's Creator OS 🇮🇳  —  Write once. Reach Bharat.\n"

# ── 1. Check Node.js ─────────────────────────────────────────────────────────
print_step "Checking Node.js version"
if ! command -v node &> /dev/null; then
  print_err "Node.js not found. Install from https://nodejs.org (v18+ required)"
fi
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  print_err "Node.js v18+ required. Current: $(node -v)"
fi
print_ok "Node.js $(node -v)"

# ── 2. Install dependencies ───────────────────────────────────────────────────
print_step "Installing dependencies"
npm install
print_ok "Dependencies installed"

# ── 3. Environment file ───────────────────────────────────────────────────────
print_step "Setting up environment"
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo -e "\n${SAFFRON}⚠  .env.local created from .env.example"
  echo -e "   Open it and fill in your values before running the app.${RESET}"
else
  print_ok ".env.local already exists"
fi

# ── 4. Generate Prisma client ─────────────────────────────────────────────────
print_step "Generating Prisma client"
if grep -q "DATABASE_URL=\"postgresql" .env.local 2>/dev/null && \
   ! grep -q 'DATABASE_URL="postgresql://USER' .env.local 2>/dev/null; then
  npm run db:generate
  print_ok "Prisma client generated"
  
  # Push schema
  print_step "Pushing database schema"
  npm run db:push
  print_ok "Schema pushed"

  # Seed
  read -p "  Seed database with demo data? (y/N) " seed
  if [[ "$seed" =~ ^[Yy]$ ]]; then
    npm run db:seed
    print_ok "Demo data seeded"
  fi
else
  npm run db:generate
  print_ok "Prisma client generated (skipping DB push — update DATABASE_URL first)"
fi

# ── 5. Done ───────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Vyral is ready! 🚀"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  ${BOLD}Next steps:${RESET}"
echo "  1. Fill in .env.local (DATABASE_URL, GOOGLE_CLIENT_ID, ANTHROPIC_API_KEY)"
echo "  2. npm run dev  →  http://localhost:3000"
echo "  3. Read OAUTH_SETUP.md to connect Instagram, Twitter, LinkedIn"
echo ""
echo -e "  ${SAFFRON}vyral.in  ·  Built in Bharat 🇮🇳${RESET}\n"
