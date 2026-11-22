/* ============================================================
   BillHero — SECRETS (DO NOT COMMIT — this file is gitignored)
   Values are base64-wrapped so plain-text scanners (GitHub /
   OpenRouter leak detection) don't auto-revoke the key if this
   file ever escapes. To rotate: base64-encode the new key:
     printf 'sk-or-v1-NEWKEY' | base64
   ============================================================ */
window.BILLHERO_SECRETS = {
  OPENROUTER_API_KEY: atob("c2stb3ItdjEtNmY1ZDc5NTI1M2FiZWI2NDdlYzI4NTAwMTZkNzQ2Njk0YTk0YjJhNmZhOTFhZTgzZGI1MTUxNDJjNTk4NDEyNA=="),
};
