# BillHero — Architecture

**Smart billing for every retail store.** A shopkeeper types, speaks, or sends a
photo of a handwritten list — in any of 9 Indian languages — and BillHero creates
the bill, updates stock, and answers business questions. Built to run on a ₹6,000
Android phone over patchy 3G.

---

## 1. Design principles (why it's built this way)

| Principle | Decision |
|---|---|
| **Must work live, even if wifi dies** | Core billing is 100% client-side. Only AI features touch the network, and each has a deterministic fallback. |
| **Near-zero cost** | Static hosting + localStorage + Gemini free tier. No server, no database bill. |
| **Runs anywhere** | Plain HTML/CSS/JS, no framework, no build step. Installable PWA. |
| **AI-native, not AI-bolted-on** | Gemini drives language understanding, multilingual replies, and handwriting OCR via structured JSON. |

---

## 2. System diagram

```
┌──────────────────────────────────────────────────────────┐
│  CLIENT  (installable PWA — index.html / styles.css / app.js) │
│                                                            │
│  Input layer:   text  •  voice (Web Speech API)  •  camera │
│  Language:      9 Indian langs, auto-detected (locale/GPS) │
│  Data:          localStorage  ── inventory + sales (real)  │
│  Offline brain: deterministic NL parser (fallback)         │
│  Service worker: network-first cache → works with no net   │
└───────────────┬──────────────────────────┬────────────────┘
                │ (only AI needs network)   │
       ┌────────▼─────────┐        ┌────────▼──────────────┐
       │  Gemini 2.5 Flash │        │  Reverse-geocode (free)│
       │  • NL → bill JSON │        │  GPS → state → language│
       │  • multilingual   │        └───────────────────────┘
       │  • handwriting OCR│
       └───────────────────┘
   Hosting: Firebase Hosting (global CDN, free SSL, Spark tier)
```

## 3. Data flow

**Billing (text/voice):** input → Gemini structured-output call (`responseSchema`)
→ `{intent, items[], reply}` → match to inventory → render bill → confirm →
write sale + decrement stock in localStorage.
*If Gemini is slow/absent:* an 8s timeout trips the regex/alias parser so a bill
still forms. The demo never hangs.

**Handwriting OCR (camera):** photo → base64 → Gemini multimodal call with the same
JSON schema → extracted `{name, qty}[]` → `invFindAll()` matches each to stock and
surfaces **variant choices** → one tap builds the bill.

**Language:** first open → guess from device locale → optional GPS → Indian state →
language. Fallback chain: *region match → closest language → English (universal)*.
Choice persists in localStorage; user can change anytime.

## 4. Reliability engineering
- **No single point of failure for billing** — data and core logic are local.
- **Every network call is wrapped** in `AbortController` timeouts + try/catch.
- **Graceful degradation** — AI off ≠ app off; it drops to offline mode with a clear status pill.
- **Service worker** caches the app shell (network-first, so code is never stale online).

## 5. Google AI integration depth
- **Gemini 2.5 Flash** — one model for three jobs: natural-language billing,
  multilingual replies, and handwritten-list OCR.
- **Structured output** (`responseMimeType: application/json` + `responseSchema`)
  turns free text/images into typed actions grounded on the shop's live inventory —
  this is an *engine*, not a chatbot.
- **Google Cloud** — Firebase Hosting serves it on a global CDN.

## 6. Cost model
| Component | Cost at demo scale |
|---|---|
| Firebase Hosting (Spark) | ₹0 (10 GB/mo free) |
| Gemini 2.5 Flash | ₹0 (free tier) |
| Data (localStorage) | ₹0 (no DB) |
| Geolocation / Web Speech | ₹0 (browser + free API) |

## 7. Scale roadmap (today's slice → full vision)
- **On-device Gemma** for fully-offline AI parsing + OCR on budget phones.
- **Firestore** for cloud sync + multi-device + multi-store.
- **Cloud Run** for server-side batch jobs (reports, reorder automation) as volume grows.
- **Online store + UPI** checkout; GST-compliant invoice exports.
