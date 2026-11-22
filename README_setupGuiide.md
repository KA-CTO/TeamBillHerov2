# BillHero

AI-powered billing and inventory app for small retail (kirana) stores in India.

## What it does

Store owners type or speak a sale in plain language — "2 Parle-G, 1 Maggi sold" — and the AI turns it into a proper bill with items, quantities, prices, and totals. Works in 9 Indian languages. Can also read handwritten product lists using camera OCR.

## Live Prototype

**https://authtest-fb63e.web.app/**

## Setup

1. Clone the repo:
   ```
   git clone <repo-url>
   cd billhero
   ```

2. Open `index.html` in any browser. No build step, no dependencies to install — it's a plain HTML/CSS/JS PWA.

   Or use a local server:
   ```
   npx serve .
   ```

3. Open `http://localhost:3000` in your browser.

That's it. The app is ready to use.

## Test Account

Use the existing test account to skip registration:

- **Email:** vikash8294@gmail.com
- **Password:** admin@123

Or create a new account from the signup page.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (no framework, no build step)
- **AI Models:** DeepSeek, Mimio, GLM — for natural language billing, multilingual chat, handwritten OCR
- **Database:** Google Cloud Platform — Firestore (database on action)
- **Hosting:** Firebase Hosting
- **PWA:** Installable, works on any device with a browser

## Features

- Natural language to bill (type or voice)
- 9 Indian languages auto-detected by location
- Camera OCR for handwritten product lists
- Inventory management
- Sales tracking and daily reports
- Installable as an app on any phone
