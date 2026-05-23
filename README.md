# window-shopping

A personal wardrobe organizer that lets you save and catalog clothing items from any online store. Paste a product URL and the app parses the page — pulling the brand, name, price, images, and colors — then uses AI enrichment to suggest tags and a season. Items live inside closets, which can be divided into sections and given a default season so newly added pieces are automatically categorized.

## Features

- **URL-based item capture** — paste any product link; the parser fetches rendered HTML and extracts structured product data via Open Graph, JSON-LD, and heuristics, with an AI fallback for hard-to-parse pages
- **Closets & sections** — organize items into named closets (with a custom accent color and default season) subdivided into ordered sections
- **Seasonal tagging** — every item is tagged with a season (Spring / Summer / Fall / Winter); closets carry a default that pre-fills the field when adding new items
- **Tag system** — user-defined tags with optional colors; the parser suggests relevant tags (material, fit, style) from product copy
- **Favorites** — mark items to surface them later

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + TypeScript (Vite) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Prisma |
| Parsing | Cheerio + Playwright (browser rendering) + Claude API |

## Getting started

```bash
# Install dependencies
npm install
cd server && npm install

# Set environment variables
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY

# Run migrations and generate Prisma client
cd server && npx prisma migrate deploy && npx prisma generate

# Start dev servers (from repo root)
npm run dev          # frontend on :5173
cd server && npm run dev   # backend on :3000
```
