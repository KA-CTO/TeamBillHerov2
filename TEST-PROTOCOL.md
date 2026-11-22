# BillHero — Browser Test Protocol (for Claude-in-Chrome)

> **Agent instructions:** You are an automated UI tester. Execute each test **in order**.
> For every test: perform the Steps, then check the Expected conditions. Mark **PASS** only
> if **all** Expected conditions are true, else **FAIL** (capture the reason). Take a screenshot
> named with the test ID. After each action, if the page shows a red console error, note it.
> At the end, output the **Results Report** table (bottom of this file).
> Do **not** invent results — only report what you actually observe on screen.

## Environment
- URL: **http://localhost:5000/**  (open in a fresh tab, hard-reload once before starting)
- Browser: Chrome. Keep the DevTools **Console** panel open; after each phase, read console for errors.
- The app is a chat UI. The **message box** is the bottom input (placeholder "Ask anything, or type a sale…").
  "Send a message X" = type X into that box and press **Enter** (or click the send ➤ button).
- Responses appear as **chat bubbles** and **cards** above the input.

## Test data (use exactly)
- New shop each signup: Shop="QA Mart", Owner="QA Bot", City="Ranchi",
  Email=`qa+<RANDOM>@billhero.test` (RANDOM = 5 digits, unique per signup), Password=`Test123456`
- Keep note of the email/password you create — reused for login tests.
- CSV file for import: `sample-vyapar-export.csv` (in the app folder)

## How to judge "a card/bubble appeared"
Match on **visible text** (case-insensitive, partial ok). Cards have bold headers like
"Stock — N items", "Business Report", "Reorder suggestion", "Customers — N", "New Bill".

---

## PHASE 0 — Sanity
### S1 — App loads clean
Steps: Load the URL. Wait 2s.
Expected: An auth card is visible with **"Login"** and **"Create shop"** tabs; **no red console errors**.
Record: screenshot S1, any console error text.

### S2 — No service worker
Steps: Open DevTools → Application → Service Workers.
Expected: **No active service worker** for this origin (list empty / "No registrations").
(If one shows, Unregister once, hard-reload, re-check.)

---

## PHASE 1 — Auth & Onboarding
### T1 — Auth UI
Steps: Observe the auth card.
Expected: Email + Password fields under Login tab; clicking **Create shop** reveals Shop/Owner/City/Email/Password fields.

### T2 — Create shop
Steps: Click **Create shop** tab. Fill the test data (new random email). Click **Create shop** button. Wait 3s.
Expected: Screen changes to **"Set up your products"** with options incl. "Start with common items" and "Import from another app".
Record: the email/password you used.

### T3b — Import CSV at onboarding
Steps: Click **Import from another app** → in the file picker choose `sample-vyapar-export.csv`. Wait 3s.
Expected: A preview appears reading **"10 products … (CSV import)"** with an **"Add 10 products & continue"** button. Click it.
Expected: You land in the chat app; header shows **"QA Mart"**.

### T5 — Stock loaded
Steps: Send message: `stock dikhao`
Expected: A **"Stock — 10 items"** card lists products (e.g. Parle-G Biscuit, Maggi…).

### T6 — Logout / Login persistence
Steps: Click the **logout** icon (top-right). On auth screen, use **Login** tab with the SAME email/password. Wait 3s. Then send `stock dikhao`.
Expected: Enters app directly (NO onboarding); Stock card still shows the 10 products.

### T7 — Multi-tenant isolation
Steps: Logout. **Create shop** with a NEW random email (Shop="QA Mart 2"). Skip products (**Skip for now**). Send `stock dikhao`.
Expected: Shows a *default/seed* catalog, NOT QA Mart's imported items → data is isolated.
Then logout & login back to the FIRST account; confirm its 10 imported items are intact.

---

## PHASE 2 — Billing & Stock (deterministic, no AI needed)
> Use the FIRST account (QA Mart, 10 imported items) for these.
### B1 — Create bill
Steps: Send `2 Parle-G, 1 Maggi bika`
Expected: A **"New Bill"** card with 2 line items, a **GST** row, a **Total**, and a **"Confirm ₹…"** button.

### B2 — Confirm bill
Steps: Click **Confirm ₹…**.
Expected: Bot bubble "**Done — ₹… ka bill save ho gaya**"; the top **"Today's Sale"** stat shows a non-₹0 amount.

### B5 — Natural phrasing
Steps: Send `do packet biscuit aur ek maggi de do`
Expected: A bill card appears (items recognized). (If AI on, may phrase differently but still a bill.)

### B7 — Undo
Steps: Send `3 Lays bika` → Confirm. On that saved bill click **Undo**.
Expected: Bubble "Bill undo ho gaya …"; the bill card stamps "Bill undone • stock restored".

---

## PHASE 3 — Stock Management
### ST1 — Stock view
Steps: Send `stock dikhao`. Expected: scrollable Stock card; low items show "· low" in red.
### ST2 — Inline edit
Steps: In the Stock card, click a product row. Expected: an **"Edit product"** sheet with Price & Stock inputs. Change Stock to 99 → **Save changes**.
Expected: Bubble "… update ho gaya — …, stock 99"; the row now shows 99.
### ST3 — Delete
Steps: Open `stock dikhao`, tap a row → **Delete product**. Expected: bubble "… stock se hata diya"; item gone from a fresh `stock dikhao`.
### ST4 — Add product
Steps: Click header **+** → type Name "Haldiram Bhujia", Price 45, Qty 12 → **Add product**. Expected: bubble "… stock me add ho gaya". Confirm via `stock dikhao`.
### ST6 — Restock
Steps: Send `10 Maggi aaya`. Expected: bubble "Stock update … Maggi: +10 (now …)".
### ST7 — Reorder
Steps: Send `kya khatam ho raha hai`. Expected: **"Reorder suggestion — N items"** card with "Order ×N" per item.

---

## PHASE 4 — Reports (deterministic)
### R1 — Today
Steps: Send `aaj kitna becha`. Expected: a sales line/card with today's total (non-zero after B2).
### R2 — Report card
Steps: Send `is hafte ka hisab`. Expected: **"Business Report"** card with two tiles (Aaj / Is hafte) and a "Top sellers" list.

---

## PHASE 5 — Customers
### C1 — Share + save
Steps: Create & Confirm a bill. On the saved bill click **WhatsApp**. In the sheet type Name "Ramesh", Number "9999988888" → **Send & Save**.
Expected: a new browser tab/window opens to a **wa.me/919999988888** URL containing bill text; back in app a bubble "Bill Ramesh ko bhej diya — customer record save…".
(If popup blocked, allow popups and retry.)
### C4 — Customer list
Steps: Send `customer list`. Expected: **"Customers — 1"** card showing Ramesh, 9999988888, spent amount.
### C5 — Validation
Steps: Confirm another bill → **WhatsApp** → type Number "12" → **Send & Save**. Expected: the number field turns **red**, no send.

---

## PHASE 6 — AI Agent (OpenRouter → Gemini)  [needs network]
### A1 — AI status
Steps: Observe the header status pill.
Expected: shows **"Gemini AI ON"** with a green dot (after the first AI reply).
### A2 — Open-ended analytics
Steps: Send `is hafte sabse zyada kya bika?`
Expected: a text reply naming the top product(s) with real numbers (not "samajh nahi aaya", not "no sales" if bills exist). Response in Hinglish.
Record: the full reply text.
### A3 — Advice
Steps: Send `aaj ka business kaisa raha, kuch salah do`
Expected: a reasoned reply referencing sales/stock. Record reply text.
### A5 — Agent creates a bill
Steps: Send `2 Lays aur 1 Dairy Milk ka bill banao`
Expected: a **bill card with Confirm** appears (agent → create_bill).
### A8 — Offline fallback
Steps: Turn OFF network (DevTools → Network → Offline). Send `stock dikhao`.
Expected: still returns a Stock card (deterministic fallback), no hang. Turn network back ON.
Record: reply + that it did not freeze.

---

## PHASE 7 — Multilingual  [needs network for native replies]
### L1 — Switch language
Steps: Use the language dropdown (top-right) → select **हिंदी**.
Expected: a greeting bubble appears in **Devanagari Hindi**; input placeholder changes.
### L2 — Native AI reply
Steps: With हिंदी selected, send `aaj kitna becha`.
Expected: reply in **Hindi script**. Record text.
### L3 — Another script
Steps: Switch to **বাংলা**; send `aaj kitna becha`. Expected: greeting + reply in **Bengali**. Record.
### L4 — Persistence
Steps: Reload page, log back in. Expected: last chosen language is still active.

---

## PHASE 8 — Voice  [manual — agent may skip if no mic]
### V1 — Mic prompt
Steps: Click the 🎤 button. Expected: browser asks mic permission; on Allow, the button pulses red.
(Agent without mic: record "SKIPPED — no mic".)

---

## PHASE 9 — Photo OCR  [needs an image file + network]
### O1 — Read handwritten list
Steps: Click 📷 → choose a clear photo of a handwritten product list. Wait 5s.
Expected: a **"Customer list read — X/Y in stock"** card; a **Create Bill** button.
### O2 — Variants / create
Steps: If a vague item shows variant chips, pick one; click **Create Bill (N)**.
Expected: a bill card appears from matched items.
(No image available: record "SKIPPED — no test image".)

---

## PHASE 10 — Sync & Persistence
### P1 — Reload persistence
Steps: Note current stock of one item (`stock dikhao`). Reload page, log back in, `stock dikhao`.
Expected: same values (loaded from cloud).
### P2 — Two-tab live sync
Steps: Open a 2nd tab to the URL, log into the SAME account. In tab 1 confirm a bill. Switch to tab 2 and send `aaj kitna becha`.
Expected: tab 2 reflects the new sale (live sync).

---

## PHASE 11 — Reliability
### E1 — Rapid bills
Steps: Quickly send and Confirm 5 bills in a row (`1 Parle-G bika` ×5).
Expected: all 5 confirm; stats add up; UI never freezes; no red console errors.
### E5 — Console clean
Steps: Scroll the DevTools Console for the whole session.
Expected: no uncaught errors (warnings OK).

---

## RESULTS REPORT (agent fills this in)
Output exactly this table, one row per test actually run:

| Test | Result (PASS/FAIL/SKIP) | Evidence (observed text / screenshot id) | Console error? |
|------|-------------------------|-------------------------------------------|----------------|
| S1   |                         |                                           |                |
| S2   |                         |                                           |                |
| T1   |                         |                                           |                |
| T2   |                         |                                           |                |
| T3b  |                         |                                           |                |
| T5   |                         |                                           |                |
| T6   |                         |                                           |                |
| T7   |                         |                                           |                |
| B1   |                         |                                           |                |
| B2   |                         |                                           |                |
| B5   |                         |                                           |                |
| B7   |                         |                                           |                |
| ST1  |                         |                                           |                |
| ST2  |                         |                                           |                |
| ST3  |                         |                                           |                |
| ST4  |                         |                                           |                |
| ST6  |                         |                                           |                |
| ST7  |                         |                                           |                |
| R1   |                         |                                           |                |
| R2   |                         |                                           |                |
| C1   |                         |                                           |                |
| C4   |                         |                                           |                |
| C5   |                         |                                           |                |
| A1   |                         |                                           |                |
| A2   |                         |                                           |                |
| A3   |                         |                                           |                |
| A5   |                         |                                           |                |
| A8   |                         |                                           |                |
| L1   |                         |                                           |                |
| L2   |                         |                                           |                |
| L3   |                         |                                           |                |
| L4   |                         |                                           |                |
| P1   |                         |                                           |                |
| P2   |                         |                                           |                |
| E1   |                         |                                           |                |
| E5   |                         |                                           |                |

Then a short **Summary**: total PASS / FAIL / SKIP, and a bullet list of every FAIL with its reason.
