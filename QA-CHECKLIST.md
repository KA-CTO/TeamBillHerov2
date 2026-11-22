# BillHero — QA Checklist

Run in **Chrome** at http://localhost:5000/ with **DevTools Console** open (watch for red errors)
and a **Firebase Console → Firestore** tab open (watch collections).
Mark each: ✅ pass · ❌ fail (note the console error) · ⚠️ partial.

> Tip: to re-test onboarding, sign up with a **new email** each time.

---

## Phase 0 — Setup / Sanity
- [ ] **S1** App loads, no red console errors
- [ ] **S2** `BILLHERO_CONFIG.AI_PROVIDER` === `"openrouter"`, key present
- [ ] **S3** Header shows a store icon, shop name slot, language dropdown, **+**, logout
- [ ] **S4** No service worker registered (Application → Service Workers is empty)

## Phase 1 — Auth & Onboarding
- [ ] **T1** Auth screen shows Login / Create shop tabs
- [ ] **T2** Create shop (new email, 6+ char pwd) → lands on "Set up your products"
- [ ] **T3a** Onboarding → **Start with common items** → enters app with seed catalog
- [ ] **T3b** Onboarding → **Import CSV** (`sample-vyapar-export.csv`) → preview 10 → add → enters app
- [ ] **T3c** Onboarding → **Paste list** (`Haldiram Bhujia 45 12`) → preview → add
- [ ] **T3d** Onboarding → **Scan photo** (handwritten list) → preview → add  *(AI)*
- [ ] **T4** Firestore: `shops/{uid}` has profile + `inventory/` subcollection with docs
- [ ] **T5** `stock dikhao` → Stock card lists imported products
- [ ] **T6** Logout → Login same account → data reloads from cloud (no onboarding)
- [ ] **T7** Create a *second* shop (diff email) → its data is separate (multi-tenant)

## Phase 2 — Billing & Atomic Stock
- [ ] **B1** `2 Parle-G, 1 Maggi bika` → bill card with items, GST, total, **Confirm**
- [ ] **B2** Confirm → "Done" msg; **Today's Sale** stat updates
- [ ] **B3** Firestore: new `sales/{id}` doc; `rollups/{today}` with total+bills+items
- [ ] **B4** Firestore: the two `inventory` docs show **reduced stock**
- [ ] **B5** Natural phrasing: `do packet biscuit aur ek maggi de do` → correct bill  *(AI or token-match)*
- [ ] **B6** Unknown item `5 xyzabc bika` → bills at ₹0 / flagged (no crash)
- [ ] **B7** Make a 2nd bill → **Undo** → stock restored, `sales` doc gone, rollup decremented

## Phase 3 — Stock Management
- [ ] **ST1** `stock dikhao` → full scrollable Stock card; low items flagged red
- [ ] **ST2** Tap a product → Edit sheet → change price + stock → **Save** → row updates + Firestore doc updates
- [ ] **ST3** Tap a product → **Delete** → row removed + Firestore doc deleted
- [ ] **ST4** **+** → Add product (name/price/qty) → added; appears in `stock dikhao`
- [ ] **ST5** **+** → Import CSV → merges (existing top-up, new added), no duplicates
- [ ] **ST6** `10 Maggi aaya` → stock increments (atomic); Firestore stock goes up
- [ ] **ST7** `kya khatam ho raha hai` → Reorder card with suggested quantities

## Phase 4 — Reports & Queries (deterministic)
- [ ] **R1** `aaj kitna becha` → today's total + top items
- [ ] **R2** `is hafte ka hisab` → Report card: today/week tiles + top-3 sellers
- [ ] **R3** With no sales (fresh shop) → graceful "koi sale nahi" (no crash)

## Phase 5 — Customers / CRM
- [ ] **C1** Confirm a bill → **WhatsApp** → enter name + 10-digit number → **Send & Save**
- [ ] **C2** WhatsApp opens to that number with formatted bill text
- [ ] **C3** Firestore: `customers/{id}` doc (name, phone, spent, bills)
- [ ] **C4** `customer list` → Customers card; repeat purchase increments bills/spent
- [ ] **C5** Bad number (<10 digits) → field goes red, blocks send

## Phase 6 — AI Agent (OpenRouter → Gemini, open-ended)
- [ ] **A1** Header shows **"Gemini AI ON"**, dot green
- [ ] **A2** `is hafte sabse zyada kya bika?` → agent calls get_top_items, answers with real data
- [ ] **A3** `aaj ka business kaisa raha, kuch salah do` → pulls sales+stock, gives advice
- [ ] **A4** `Ramesh ne kitna kharcha kiya` → find_customer → answer  *(after C1 with that name)*
- [ ] **A5** `3 Lays aur 2 Dairy Milk ka bill banao` → agent → create_bill → confirm card
- [ ] **A6** `20 Maggi stock aa gaya` (natural) → agent → add_stock → stock up
- [ ] **A7** Nonsense/off-topic question → graceful answer, no crash
- [ ] **A8** Turn wifi off → ask a question → falls back to deterministic/offline (no hang)

## Phase 7 — Multilingual
- [ ] **L1** Language dropdown → switch to **हिंदी** → greeting re-prints in Hindi
- [ ] **L2** In Hindi, ask `aaj kitna becha` equivalent → agent replies in Hindi  *(AI)*
- [ ] **L3** Switch to **বাংলা / தமிழ்** → greeting + AI reply in that script  *(AI)*
- [ ] **L4** Language choice persists after reload
- [ ] **L5** First-run (new shop) → welcome sheet pre-guesses language; "Detect by location" works

## Phase 8 — Voice
- [ ] **V1** Tap 🎤 → mic permission prompt → Allow → button pulses red
- [ ] **V2** Speak a sale → words fill the input live → send → bill
- [ ] **V3** Deny mic → clear error message (no crash)
- [ ] **V4** Voice follows selected language locale

## Phase 9 — Photo OCR (handwriting)
- [ ] **O1** 📷 → pick a clear handwritten list photo → "list read" card  *(AI)*
- [ ] **O2** Vague item (e.g. "milk") shows **variant chips** to pick
- [ ] **O3** Not-in-stock items flagged; **Create Bill** builds from matched items
- [ ] **O4** Blurry/empty photo → graceful "koi list nahi mili"

## Phase 10 — Cloud Sync & Persistence
- [ ] **P1** Make changes → refresh → data still there (from Firestore)
- [ ] **P2** Open the same account in a **2nd tab** → a bill in tab A appears in tab B (live sync)
- [ ] **P3** Logout → login → inventory/sales/customers all restored
- [ ] **P4** Firestore shows all 4 subcollections: inventory, sales, customers, rollups

## Phase 11 — Reliability & Security
- [ ] **E1** Rapid-fire 5 bills → all save, stats correct, no stuck UI
- [ ] **E2** Offline (wifi off): billing/stock/reports still work (deterministic + local)
- [ ] **E3** Back online → queued writes sync to Firestore
- [ ] **E4** Tenant isolation: data never leaks between the two shops from T7
- [ ] **E5** No uncaught red errors across the whole run

---

## Known limits (not bugs)
- AI features need network + OpenRouter credits (currently ~$5 left)
- Daily free Gemini-direct quota is tiny → we route via OpenRouter on purpose
- Rollup doc is a per-shop daily counter → fine for human speed; shard later for >1 bill/sec stress
- Offline/PWA SW is disabled during dev (re-enabled at deploy)
