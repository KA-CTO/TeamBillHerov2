# BillHero — Smart Billing for Every Retail Store

Pure **HTML/CSS/JS** — no framework, no build step, no backend server.
An installable PWA that deploys as a static site to **Firebase Hosting (free tier)**.

> Type, speak, or send a photo of a handwritten list — in 9 Indian languages —
> and BillHero makes the bill, updates stock, and answers business questions.

## Features
- 🧾 **Conversational billing** — `2 Parle-G, 1 Maggi bika` → itemized bill + GST
- 📦 **Stock tracking** — auto-decrement on sale, `10 Maggi aaya` to restock
- 📊 **Business queries** — `aaj kitna becha?`, `kya khatam ho raha hai?`
- 📷 **Handwriting OCR** — photo of a customer's list → matched to stock + variants
- 🗣️ **Voice input** — Web Speech API (free), follows the chosen language
- 🌐 **9 languages** — Hinglish, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, English
- 📍 **Auto language** — detected on first open (locale / optional GPS), English fallback
- 🔌 **Works offline** — deterministic parser + localStorage; AI is an upgrade, not a crutch

## File structure
```
index.html      app shell (chat UI)
styles.css      WhatsApp-style, mobile-first, dark-mode
app.js          all logic: billing engine, AI layer, OCR, voice, i18n
config.js       ← EDIT ONLY THIS: paste Gemini key
sw.js           service worker (offline PWA)
manifest.json   PWA manifest
firebase.json   Firebase Hosting config
ARCHITECTURE.md architecture notes for judges
```

## Run locally
```bash
cd hack2skill_product
python3 -m http.server 5000
# open http://localhost:5000  (use Chrome for voice + camera)
```

## Add the Gemini key (later — one line)
1. Get a free key: https://aistudio.google.com/apikey
2. Open **config.js** → paste into `GEMINI_API_KEY: "..."`
3. That's it. The AI, multilingual replies, and 📷 handwriting-reading turn on.
   (Without a key the app still runs in offline mode — billing, stock, queries, voice.)

**Before the demo (2 min, keeps the key safe + free):**
Google Cloud Console → *APIs & Services → Credentials* → your key →
*Application restrictions → HTTP referrers* → add your Hosting domain `*.web.app`.

## Turn on the cloud database (shared, multi-user)
The app runs on localStorage until you add a Firebase config. To switch on the
real cloud DB (one Firestore shared by all users, isolated per shop):
1. Firebase console → **Create project** (free Spark plan).
2. **Build → Authentication → Sign-in method → enable Anonymous.**
3. **Build → Firestore Database → Create** (start in production mode).
4. **Project settings → Your apps → Web app** → copy the config object.
5. Paste it into `config.js` → `FIREBASE_CONFIG: { apiKey, authDomain, projectId, ... }`.
6. Deploy the rules: `firebase deploy --only firestore:rules` (file: `firestore.rules`).

Now every device signs in anonymously, gets its own `shops/{uid}` document, and
data syncs live across sessions — all on one database, each shop isolated by rules.

## Deploy to Firebase Hosting (free, Google-native)
Firebase CLI needs Node installed once (just the tool, not a framework):
```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # existing/new project · public dir: "." · SPA: No · keep index.html
firebase deploy
```
→ live at `https://<project>.web.app`. Put it on the projector / judge's phone.

## Cost = ₹0 at demo scale
Firebase Hosting Spark tier + Gemini 2.5 Flash free tier + localStorage (no DB).

## Demo checklist
- [ ] Paste Gemini key in `config.js`
- [ ] Restrict the key to your domain
- [ ] `firebase deploy`
- [ ] Test on a **phone hotspot** (not venue wifi): typing, voice, 1–2 handwritten photos
- [ ] Record a 60s backup video in case live network fails
- [ ] Language demo: switch to Bengali/Tamil, show native reply

See **ARCHITECTURE.md** for the full technical write-up and scale roadmap.
