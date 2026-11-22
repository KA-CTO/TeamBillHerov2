/* ============================================================
   BillHero — SECRETS TEMPLATE
   Copy this file to secrets.js and fill in your own key:
     cp secrets.example.js secrets.js
     printf 'sk-or-v1-YOURKEY' | base64   → paste inside atob("...")
   secrets.js is gitignored and never committed.
   ============================================================ */
window.BILLHERO_SECRETS = {
  OPENROUTER_API_KEY: atob("PASTE_BASE64_OF_YOUR_OPENROUTER_KEY_HERE"),
};
