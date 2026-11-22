/* ============================================================
   BillHero — CONFIG  (edit THIS file only)
   ------------------------------------------------------------
   Paste your Gemini API key below to turn on AI (natural Hindi,
   multilingual replies, and handwriting/photo reading).
   Get a free key: https://aistudio.google.com/apikey
   Leave it "" and the app still runs fully in offline mode.
   ============================================================ */
window.BILLHERO_CONFIG = {
  // ---- AI provider ----
  // "openrouter" → DeepSeek (chat) + MiMo (fallback/vision/voice). This is the live setup.
  // "gemini"     → direct Google Gemini (NOT used; kept only as an emergency switch)
  AI_PROVIDER:    "openrouter",
  // key lives in secrets.js (gitignored) — see secrets.example.js
  OPENROUTER_API_KEY: (window.BILLHERO_SECRETS && window.BILLHERO_SECRETS.OPENROUTER_API_KEY) || "",
  // Workhorse: chat fallback + vision/OCR + CSV mapping (image+audio capable, ultra-cheap)
  OPENROUTER_MODEL:   "xiaomi/mimo-v2.6-flash",

  // Chat agent: primary brain (auto-falls back to OPENROUTER_MODEL on failure/empty reply)
  CHAT_MODEL:         "deepseek/deepseek-v4.1-flash",   // tools verified, fast, no reasoning-stall quirk

  // OCR / photo reading (dedicated vision models — live-tested 21 Nov: 2.6s & 4.4s reads):
  OCR_MODEL:    "qwen/qwen3-vl-30b-a3b-instruct",  // primary: fastest + perfect on handwriting
  OCR_FALLBACK: "z-ai/glm-5.3-flash",              // backup: GLM, also verified

  // Voice transcription chain (audio-capable models only):
  TRANSCRIBE_MODEL:    "xiaomi/mimo-v2.6-flash",        // audio verified
  TRANSCRIBE_FALLBACK: "qwen/qwen3.8-omni-flash",       // audio verified backup

  GEMINI_API_KEY: "",                  // not used (DeepSeek/MiMo stack); dormant emergency switch
  GEMINI_MODEL:   "gemini-3.5-flash",
  WHATSAPP_ENABLED: false,             // true → bill WhatsApp-send flow wapis on ho jayega
  GST_RATE:       0.05,                // 5% demo GST
  STORE_NAME:     "Sharma General Store",

  // ---- Cloud database ----
  FIREBASE_CONFIG: {
    apiKey:            "AIzaSyCAnmS4-TUDVmeieOBHccbOOSXfxrtk3Lw",
    authDomain:        "authtest-fb63e.firebaseapp.com",
    projectId:         "authtest-fb63e",
    storageBucket:     "authtest-fb63e.firebasestorage.app",
    messagingSenderId: "122114712263",
    appId:             "1:122114712263:web:0900d2814a3ff6002654e2"
  }
};
