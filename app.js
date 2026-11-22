/* ============================================================
   BillHero — Smart Billing for Every Retail Store
   Pure HTML/CSS/JS. No framework, no build, no backend.
   AI: Gemini 2.5 Flash (optional) with a deterministic fallback
   so the app ALWAYS works live — even with no key / no internet.
   ============================================================ */

/* ---------- 0. CONFIG (values come from config.js) ---------- */
const BUILD = "r42";
console.info("[BillHero] build:", BUILD);

// Global safety net: an uncaught error must NEVER freeze the chat silently.
// Kill any stuck typing indicator and tell the user, with the real error in console.
function rescueChat(src, err){
  console.error("[rescue]", src, err);
  const t = document.getElementById("typing");
  if(t){
    t.remove();
    const chatEl = document.getElementById("chat");
    if(chatEl){
      const d = document.createElement("div");
      d.className = "msg bot";
      d.innerHTML = `Kuch gadbad ho gayi — message dobara bhejein.<span class="t"></span>`;
      chatEl.appendChild(d); chatEl.scrollTop = chatEl.scrollHeight;
    }
  }
}
window.addEventListener("error", e => rescueChat("error", e.error || e.message));
window.addEventListener("unhandledrejection", e => rescueChat("promise", e.reason));
const SESSION_ID = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);  // tags this device's writes
const CFG = window.BILLHERO_CONFIG || {};
const WA_ON = CFG.WHATSAPP_ENABLED !== false;   // WhatsApp send flow (config switch; off for now)
const GEMINI_API_KEY = CFG.GEMINI_API_KEY || "";
const GEMINI_MODEL   = CFG.GEMINI_MODEL   || "gemini-3.5-flash";
const GST_RATE       = (typeof CFG.GST_RATE === "number") ? CFG.GST_RATE : 0.05;

/* ---------- AI provider (Gemini direct, or OpenRouter → Gemini model) ---------- */
const AI_PROVIDER       = CFG.AI_PROVIDER || (CFG.OPENROUTER_API_KEY ? "openrouter" : (GEMINI_API_KEY ? "gemini" : ""));
const OPENROUTER_API_KEY= CFG.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL  = CFG.OPENROUTER_MODEL || "xiaomi/mimo-v2.6-flash";
const AI_ENABLED = AI_PROVIDER === "openrouter" ? !!OPENROUTER_API_KEY
                 : AI_PROVIDER === "gemini"     ? !!GEMINI_API_KEY : false;

/* ---------- 0b. LANGUAGES (8 pan-India) ---------- */
// code  = Web Speech voice locale; gName = how Gemini should reply;
// ph    = input placeholder; greet = welcome line in that language.
const LANGS = [
  { id:"hinglish", label:"Hinglish", code:"en-IN", gName:"Hinglish (Hindi written in Roman/English letters, e.g. 'Bill ban gaya')",
    ph:"Jaise: 2 Parle-G, 1 Maggi bika…",
    greet:"Namaste! Main <b>BillHero</b> hoon<br>Bill banane, stock dekhne ya sale poochhne ke liye likhein ya bolein.<br><br>Jaise: <b>“2 Parle-G, 1 Maggi bika”</b>" },
  { id:"hindi", label:"हिंदी", code:"hi-IN", gName:"Hindi (Devanagari script)",
    ph:"जैसे: 2 पारले-जी, 1 मैगी बिकी…",
    greet:"नमस्ते! मैं <b>BillHero</b> हूँ<br>बिल बनाने, स्टॉक देखने या बिक्री पूछने के लिए लिखें या बोलें।" },
  { id:"bengali", label:"বাংলা", code:"bn-IN", gName:"Bengali",
    ph:"যেমন: 2 Parle-G, 1 Maggi বিক্রি হয়েছে…",
    greet:"নমস্কার! আমি <b>BillHero</b><br>বিল তৈরি, স্টক দেখা বা বিক্রি জানতে লিখুন বা বলুন।" },
  { id:"tamil", label:"தமிழ்", code:"ta-IN", gName:"Tamil",
    ph:"உதா: 2 Parle-G, 1 Maggi விற்றது…",
    greet:"வணக்கம்! நான் <b>BillHero</b><br>பில் உருவாக்க, ஸ்டாக் பார்க்க அல்லது விற்பனை அறிய தட்டச்சு செய்யவும் அல்லது பேசவும்." },
  { id:"telugu", label:"తెలుగు", code:"te-IN", gName:"Telugu",
    ph:"ఉదా: 2 Parle-G, 1 Maggi అమ్ముడైంది…",
    greet:"నమస్కారం! నేను <b>BillHero</b><br>బిల్లు చేయడానికి, స్టాక్ చూడటానికి లేదా అమ్మకాలు తెలుసుకోవడానికి టైప్ చేయండి లేదా మాట్లాడండి." },
  { id:"marathi", label:"मराठी", code:"mr-IN", gName:"Marathi",
    ph:"उदा: 2 Parle-G, 1 Maggi विकले…",
    greet:"नमस्कार! मी <b>BillHero</b><br>बिल तयार करण्यासाठी, स्टॉक पाहण्यासाठी किंवा विक्री जाणून घेण्यासाठी टाइप करा किंवा बोला." },
  { id:"gujarati", label:"ગુજરાતી", code:"gu-IN", gName:"Gujarati",
    ph:"દા.ત: 2 Parle-G, 1 Maggi વેચાયું…",
    greet:"નમસ્તે! હું <b>BillHero</b><br>બિલ બનાવવા, સ્ટોક જોવા કે વેચાણ જાણવા ટાઇપ કરો અથવા બોલો." },
  { id:"kannada", label:"ಕನ್ನಡ", code:"kn-IN", gName:"Kannada",
    ph:"ಉದಾ: 2 Parle-G, 1 Maggi ಮಾರಾಟವಾಯಿತು…",
    greet:"ನಮಸ್ಕಾರ! ನಾನು <b>BillHero</b><br>ಬಿಲ್ ಮಾಡಲು, ಸ್ಟಾಕ್ ನೋಡಲು ಅಥವಾ ಮಾರಾಟ ತಿಳಿಯಲು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ." },
  { id:"english", label:"English", code:"en-IN", gName:"simple English",
    ph:"e.g. 2 Parle-G, 1 Maggi sold…",
    greet:"Hi! I'm <b>BillHero</b><br>Type or speak to create a bill, check stock, or see today's sales.<br><br>e.g. <b>“2 Parle-G, 1 Maggi sold”</b>" },
];
let CUR = LANGS[0];       // current language
let REC = null;           // speech recognition instance

/* ---------- 1. SEED DATA (real Indian kirana SKUs) ---------- */
// Starter catalog for ONBOARDING imports — 60 kirana staples, all stocked at 500.
const SEED_INVENTORY = [
  // Biscuits & snacks
  { name: "Parle-G",                 price: 10,  stock: 500, unit: "pkt", low: 20 },
  { name: "Britannia Good Day",      price: 30,  stock: 500, unit: "pkt", low: 20 },
  { name: "Britannia Marie Gold",    price: 35,  stock: 500, unit: "pkt", low: 20 },
  { name: "Oreo 120g",               price: 30,  stock: 500, unit: "pkt", low: 20 },
  { name: "Lays",                    price: 20,  stock: 500, unit: "pkt", low: 20 },
  { name: "Lays (Big)",              price: 50,  stock: 500, unit: "pkt", low: 20 },
  { name: "Kurkure 90g",             price: 20,  stock: 500, unit: "pkt", low: 20 },
  { name: "Bingo Mad Angles",        price: 20,  stock: 500, unit: "pkt", low: 20 },
  { name: "Haldiram Bhujia 200g",    price: 55,  stock: 500, unit: "pkt", low: 20 },
  { name: "Dairy Milk",              price: 40,  stock: 500, unit: "pc",  low: 20 },
  { name: "KitKat",                  price: 25,  stock: 500, unit: "pc",  low: 20 },
  { name: "Munch",                   price: 10,  stock: 500, unit: "pc",  low: 20 },
  // Noodles & instant
  { name: "Maggi 2-Min",             price: 14,  stock: 500, unit: "pkt", low: 20 },
  { name: "Maggi Ketchup 500g",      price: 125, stock: 500, unit: "btl", low: 20 },
  { name: "Yippee Noodles",          price: 15,  stock: 500, unit: "pkt", low: 20 },
  { name: "Pasta 250g",              price: 45,  stock: 500, unit: "pkt", low: 20 },
  // Staples (atta, rice, dal, sugar, salt, oil, masala)
  { name: "Aashirvaad Atta 5kg",     price: 265, stock: 500, unit: "bag", low: 20 },
  { name: "Aashirvaad Atta 10kg",    price: 520, stock: 500, unit: "bag", low: 20 },
  { name: "Basmati Rice 1kg",        price: 110, stock: 500, unit: "kg",  low: 20 },
  { name: "Sona Masoori Rice 5kg",   price: 320, stock: 500, unit: "bag", low: 20 },
  { name: "Sugar 1kg",               price: 45,  stock: 500, unit: "kg",  low: 20 },
  { name: "Tata Salt",               price: 28,  stock: 500, unit: "kg",  low: 20 },
  { name: "Toor Dal 1kg",            price: 160, stock: 500, unit: "kg",  low: 20 },
  { name: "Chana Dal 1kg",           price: 95,  stock: 500, unit: "kg",  low: 20 },
  { name: "Moong Dal 1kg",           price: 125, stock: 500, unit: "kg",  low: 20 },
  { name: "Kabuli Chana 500g",       price: 70,  stock: 500, unit: "pkt", low: 20 },
  { name: "Besan 500g",              price: 60,  stock: 500, unit: "pkt", low: 20 },
  { name: "Poha 500g",               price: 40,  stock: 500, unit: "pkt", low: 20 },
  { name: "Suji 500g",               price: 35,  stock: 500, unit: "pkt", low: 20 },
  { name: "Maida 1kg",               price: 50,  stock: 500, unit: "kg",  low: 20 },
  { name: "Fortune Sunflower Oil 1L",price: 145, stock: 500, unit: "btl", low: 20 },
  { name: "Saffola Gold 1L",         price: 185, stock: 500, unit: "btl", low: 20 },
  { name: "Mustard Oil 1L",          price: 160, stock: 500, unit: "btl", low: 20 },
  { name: "Parachute Coconut Oil 200ml", price: 95, stock: 500, unit: "btl", low: 20 },
  { name: "MDH Garam Masala 100g",   price: 75,  stock: 500, unit: "pkt", low: 20 },
  { name: "Everest Chilli Powder 100g", price: 55, stock: 500, unit: "pkt", low: 20 },
  { name: "Haldi Powder 200g",       price: 45,  stock: 500, unit: "pkt", low: 20 },
  { name: "Jeera 100g",              price: 40,  stock: 500, unit: "pkt", low: 20 },
  // Dairy & bread
  { name: "Amul Milk 500ml",         price: 27,  stock: 500, unit: "pkt", low: 20 },
  { name: "Amul Milk 1L",            price: 54,  stock: 500, unit: "pkt", low: 20 },
  { name: "Amul Butter 100g",        price: 55,  stock: 500, unit: "pc",  low: 20 },
  { name: "Amul Ghee 500ml",         price: 320, stock: 500, unit: "jar", low: 20 },
  { name: "Amul Cheese 200g",        price: 130, stock: 500, unit: "pkt", low: 20 },
  { name: "Curd 400g",               price: 35,  stock: 500, unit: "cup", low: 20 },
  { name: "Paneer 200g",             price: 90,  stock: 500, unit: "pkt", low: 20 },
  { name: "Britannia Bread",         price: 45,  stock: 500, unit: "pkt", low: 20 },
  { name: "Eggs (6)",                price: 42,  stock: 500, unit: "tray",low: 20 },
  // Beverages
  { name: "Taj Mahal Tea 250g",      price: 150, stock: 500, unit: "pkt", low: 20 },
  { name: "Red Label Tea 500g",      price: 260, stock: 500, unit: "pkt", low: 20 },
  { name: "Nescafe Classic 50g",     price: 190, stock: 500, unit: "jar", low: 20 },
  { name: "Bournvita 500g",          price: 240, stock: 500, unit: "jar", low: 20 },
  { name: "Thums Up 750ml",          price: 45,  stock: 500, unit: "btl", low: 20 },
  { name: "Sprite 750ml",            price: 45,  stock: 500, unit: "btl", low: 20 },
  { name: "Frooti 200ml",            price: 10,  stock: 500, unit: "pc",  low: 20 },
  { name: "Red Bull",                price: 125, stock: 500, unit: "can", low: 20 },
  { name: "Bisleri 1L",              price: 20,  stock: 500, unit: "btl", low: 20 },
  // Personal care & household
  { name: "Colgate 100g",            price: 55,  stock: 500, unit: "pc",  low: 20 },
  { name: "Lifebuoy Soap",           price: 35,  stock: 500, unit: "pc",  low: 20 },
  { name: "Dettol Soap",             price: 45,  stock: 500, unit: "pc",  low: 20 },
  { name: "Clinic Plus Shampoo 180ml", price: 95, stock: 500, unit: "btl", low: 20 },
  { name: "Surf Excel 1kg",          price: 125, stock: 500, unit: "pkt", low: 20 },
  { name: "Vim Bar",                 price: 10,  stock: 500, unit: "pc",  low: 20 },
  { name: "Harpic 500ml",            price: 95,  stock: 500, unit: "btl", low: 20 },
  { name: "Dettol Antiseptic 125ml", price: 70,  stock: 500, unit: "btl", low: 20 },
  { name: "Vicks VapoRub 50ml",      price: 150, stock: 500, unit: "jar", low: 20 },
  { name: "Agarbatti (Mogra)",       price: 25,  stock: 500, unit: "pkt", low: 20 },
];
// aliases help the offline parser recognise messy input
const ALIASES = {
  "Parle-G":["parle","parleg","parle g","पारले","पारले-जी","biscuit","biscuits","parle-g"],
  "Maggi 2-Min":["maggi","मैगी","noodles","magi"],
  "Lays":["lays","लेज","chips","les"],
  "Tata Salt":["salt","namak","नमक","tata salt"],
  "Amul Milk 500ml":["milk","doodh","दूध","amul","amul milk"],
  "Colgate 100g":["colgate","toothpaste","manjan","कोलगेट"],
  "Surf Excel 1kg":["surf","surf excel","detergent","sabun powder"],
  "Dairy Milk":["dairy milk","cadbury","chocolate","चॉकलेट"],
  "Red Bull":["red bull","redbull","energy drink"],
  "Aashirvaad Atta 5kg":["atta","aashirvaad","flour","आटा","ashirwad","5kg"],
  "Thums Up 750ml":["thums up","thumsup","cold drink","thanda","coke"],
  "Britannia Bread":["bread","britannia","पाव","double roti"],
  "Amul Milk 1L":["milk","doodh","दूध","amul","1 litre","1l","liter"],
  "Aashirvaad Atta 10kg":["atta","aashirvaad","flour","आटा","ashirwad","10kg"],
  "Lays (Big)":["lays","chips","big lays","bada packet"],
  "Sugar 1kg":["sugar","chini","cheeni","shakkar","चीनी","शक्कर"],
  "Basmati Rice 1kg":["rice","chawal","chaval","चावल","basmati"],
  "Sona Masoori Rice 5kg":["rice","chawal","चावल","sona masoori"],
  "Toor Dal 1kg":["dal","daal","toor","arhar","दाल","तूर"],
  "Chana Dal 1kg":["dal","daal","chana dal","चना दाल"],
  "Moong Dal 1kg":["dal","daal","moong","मूंग"],
  "Kabuli Chana 500g":["chana","chhole","chole","छोले","चना","kabuli"],
  "Besan 500g":["besan","बेसन","gram flour"],
  "Poha 500g":["poha","पोहा","chivda"],
  "Suji 500g":["suji","sooji","rava","सूजी","रवा"],
  "Maida 1kg":["maida","मैदा"],
  "Fortune Sunflower Oil 1L":["oil","tel","तेल","sunflower","fortune","refined"],
  "Saffola Gold 1L":["oil","tel","तेल","saffola"],
  "Mustard Oil 1L":["oil","tel","तेल","sarson","sarso","सरसों"],
  "Parachute Coconut Oil 200ml":["coconut oil","nariyal tel","नारियल","parachute"],
  "Amul Ghee 500ml":["ghee","घी","desi ghee"],
  "Amul Butter 100g":["butter","makkhan","मक्खन","amul butter"],
  "Amul Cheese 200g":["cheese","चीज़","paneer cheese"],
  "Curd 400g":["curd","dahi","दही","yogurt"],
  "Paneer 200g":["paneer","पनीर"],
  "Eggs (6)":["egg","eggs","anda","ande","अंडा","अंडे"],
  "Taj Mahal Tea 250g":["tea","chai","chay","चाय","taj mahal"],
  "Red Label Tea 500g":["tea","chai","चाय","red label"],
  "Nescafe Classic 50g":["coffee","nescafe","कॉफी"],
  "Bournvita 500g":["bournvita","बॉर्नविटा","horlicks"],
  "Sprite 750ml":["sprite","cold drink","soda"],
  "Frooti 200ml":["frooti","juice","mango drink","फ्रूटी"],
  "Bisleri 1L":["water","pani","पानी","bisleri","bottle"],
  "Lifebuoy Soap":["soap","sabun","साबुन","lifebuoy"],
  "Dettol Soap":["soap","sabun","साबुन","dettol"],
  "Clinic Plus Shampoo 180ml":["shampoo","शैम्पू","clinic plus"],
  "Vim Bar":["vim","dishwash","bartan sabun","विम"],
  "Harpic 500ml":["harpic","toilet cleaner","हार्पिक"],
  "Dettol Antiseptic 125ml":["antiseptic","dettol liquid"],
  "Vicks VapoRub 50ml":["vicks","विक्स","balm"],
  "Agarbatti (Mogra)":["agarbatti","incense","अगरबत्ती","dhoop"],
  "Kurkure 90g":["kurkure","कुरकुरे","namkeen"],
  "Haldiram Bhujia 200g":["bhujia","namkeen","भुजिया","haldiram"],
  "Britannia Good Day":["good day","biscuit","गुड डे"],
  "Britannia Marie Gold":["marie","biscuit","मारी"],
  "Oreo 120g":["oreo","biscuit","ओरियो"],
  "KitKat":["kitkat","kit kat","chocolate","किटकैट"],
  "Munch":["munch","chocolate","मंच"],
  "Yippee Noodles":["yippee","noodles","यिप्पी"],
  "Maggi Ketchup 500g":["ketchup","sauce","कैचप"],
  "Pasta 250g":["pasta","पास्ता","macaroni"],
  "MDH Garam Masala 100g":["garam masala","masala","गरम मसाला"],
  "Everest Chilli Powder 100g":["chilli","mirchi","lal mirch","मिर्च"],
  "Haldi Powder 200g":["haldi","turmeric","हल्दी"],
  "Jeera 100g":["jeera","cumin","जीरा"],
};

/* ---------- 2. STORAGE (subcollection model) ----------
   In-memory mirror (STATE) for instant sync reads. Writes go through Store:
   each change is a granular operation on a real collection
   (inventory / sales / customers / rollups). Firestore keeps STATE live via
   per-collection listeners; local mode persists to localStorage. Reports read
   pre-aggregated rollups, so they never scan all sales. */
function load(key, fallback){ try{ const v=JSON.parse(localStorage.getItem(key)); return (v===null||v===undefined)?fallback:v; }catch(e){ return fallback; } }
let CURRENT = null; // current shop: {uid, shopName, ownerName, city, email}
const STATE = { inv: [], sales: [], customers: [], orders: [], rollups: {} };

const genId   = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const ensureId = x => { if(x && !x.id) x.id = genId(); return x; };
const dateKey = ts => new Date(ts).toISOString().slice(0,10);

function applyRollup(sale, sign){
  const k = dateKey(sale.ts);
  const r = STATE.rollups[k] || { total:0, bills:0, items:{} };
  r.total += sign*(sale.total||0);
  r.bills += sign*1;
  (sale.items||[]).forEach(it => { r.items[it.name] = (r.items[it.name]||0) + sign*(it.qty||0); });
  STATE.rollups[k] = r;
}
function rebuildRollups(){ STATE.rollups = {}; STATE.sales.forEach(s => applyRollup(s, +1)); }

function cacheKey(){ return CURRENT ? `bh_data_${CURRENT.uid}` : "bh_data_guest"; }
function persistLocal(){ if(CURRENT){ try{ localStorage.setItem(cacheKey(), JSON.stringify({inv:STATE.inv, sales:STATE.sales, customers:STATE.customers, orders:STATE.orders})); }catch(e){} } }
function loadShopData(uid, seedNew){
  const saved = seedNew ? null : load(`bh_data_${uid}`, null);
  STATE.inv       = (saved && saved.inv)       || structuredClone(SEED_INVENTORY);
  STATE.sales     = (saved && saved.sales)     || [];
  STATE.customers = (saved && saved.customers) || [];
  STATE.orders    = (saved && saved.orders)    || [];
  STATE.inv.forEach(ensureId); STATE.sales.forEach(ensureId); STATE.customers.forEach(ensureId);
  rebuildRollups();
  if(!saved && uid) persistLocal();
}

// read-only views
const DB = { get inv(){ return STATE.inv; }, get sales(){ return STATE.sales; }, get customers(){ return STATE.customers; }, get orders(){ return STATE.orders; } };

// write layer — granular ops, Firestore when live else localStorage
const CLOUD = () => (window.BillHeroCloud && window.BillHeroCloud.ready) ? window.BillHeroCloud : null;
const Store = {
  upsertItem(item){
    ensureId(item);
    const idx = STATE.inv.findIndex(x => x.id===item.id || x.name.toLowerCase()===item.name.toLowerCase());
    let saved;
    if(idx>=0){ saved = Object.assign(STATE.inv[idx], item, { id: STATE.inv[idx].id }); }
    else { saved = item; STATE.inv.push(item); }
    refreshStats();
    const c=CLOUD(); if(c) c.setItem(saved); else persistLocal();
    return saved;
  },
  deleteItem(name){
    const item = STATE.inv.find(i=>i.name===name);
    STATE.inv = STATE.inv.filter(i=>i.name!==name);
    refreshStats();
    const c=CLOUD(); if(c && item) c.deleteItem(item.id); else persistLocal();
  },
  addStock(entries){               // [{name, qty}] → atomic increments
    const rows=[];
    entries.forEach(e=>{ const row = STATE.inv.find(i=>i.name===e.name) || invFind(e.name||""); if(row){ row.stock=(row.stock||0)+(e.qty||0); rows.push({row, delta:e.qty||0}); } });
    refreshStats();
    const c=CLOUD(); if(c) rows.forEach(r=>c.adjustStock(r.row.id, r.delta)); else persistLocal();
    return rows.map(r=>({ name:r.row.name, delta:r.delta, stock:r.row.stock }));
  },
  recordSale(sale){                // add sale + decrement stock + bump rollup (atomic in cloud)
    ensureId(sale);
    sale.items.forEach(it=>{ const row=STATE.inv.find(i=>i.name===it.name); if(row){ it.id=row.id; row.stock=Math.max(0,(row.stock||0)-(it.qty||0)); } });
    STATE.sales.unshift(sale); applyRollup(sale,+1); refreshStats();
    const c=CLOUD(); if(c) c.recordSale(sale); else persistLocal();
  },
  removeSale(saleId){
    const idx = saleId ? STATE.sales.findIndex(s=>s.id===saleId) : 0;
    if(idx<0 || !STATE.sales.length) return null;
    const sale = STATE.sales[idx];
    sale.items.forEach(it=>{ const row=STATE.inv.find(i=>i.name===it.name); if(row) row.stock=(row.stock||0)+(it.qty||0); });
    STATE.sales.splice(idx,1); applyRollup(sale,-1); refreshStats();
    const c=CLOUD(); if(c) c.removeSale(sale); else persistLocal();
    return sale;
  },
  upsertCustomer(name, phone, addSpent){
    let cust = STATE.customers.find(x=>x.phone===phone);
    if(cust){ cust.name=name||cust.name; cust.bills=(cust.bills||0)+1; cust.spent=(cust.spent||0)+(addSpent||0); cust.ts=Date.now(); ensureId(cust); }
    else { cust={ id:genId(), name:name||"Customer", phone, bills:1, spent:addSpent||0, ts:Date.now() }; STATE.customers.push(cust); }
    const c=CLOUD(); if(c) c.setCustomer(cust); else persistLocal();
    return cust;
  },
  setInventory(items){             // bulk replace (onboarding / import)
    items.forEach(ensureId); STATE.inv = items; refreshStats();
    const c=CLOUD(); if(c) c.setInventory(items); else persistLocal();
  },
  createOrder(items){              // supplier purchase order
    const order = { id: genId(), ts: Date.now(), status:"pending",
      items: (items||[]).filter(x=>x && x.name).map(x=>({ name:String(x.name).trim(), qty:Number(x.qty)||1 })) };
    if(!order.items.length) return null;
    STATE.orders.unshift(order);
    const c=CLOUD(); if(c && c.setOrder) c.setOrder(order); else persistLocal();
    return order;
  },
  receiveOrder(id){                // goods arrived → stock in + close the order
    const o = STATE.orders.find(x=>x.id===id);
    if(!o || o.status !== "pending") return null;
    o.status = "received"; o.receivedAt = Date.now();
    o.items.forEach(it=>{
      const row = STATE.inv.find(i=>i.name.toLowerCase()===it.name.toLowerCase()) || invFind(it.name);
      if(row) this.addStock([{ name: row.name, qty: it.qty }]);
      else this.upsertItem({ name: it.name, price: 0, stock: it.qty, unit:"pc", low:5 });  // brand-new product
    });
    const c=CLOUD(); if(c && c.setOrder) c.setOrder(o); else persistLocal();
    return o;
  },
};

/* Cloud bridge — db.js (Firestore) pushes each collection's live snapshot here */
window.__setInventory = arr => { STATE.inv = (arr||[]).map(ensureId); refreshStats(); };
window.__setSales     = arr => { STATE.sales = (arr||[]).map(ensureId); refreshStats(); };
window.__setCustomers = arr => { STATE.customers = (arr||[]).map(ensureId); };
window.__setOrders    = arr => { STATE.orders = (arr||[]).map(ensureId); };
window.__setRollups   = map => { STATE.rollups = map || {}; refreshStats(); };
window.__cloudStatus  = on  => { if(on){ const d=document.getElementById("aiDot"); if(d) d.classList.add("on"); } };
// surfaced by db.js when a cloud write fails after retry (debounced)
let _syncWarnAt = 0;
window.__syncWarn = () => {
  const n = Date.now(); if(n - _syncWarnAt < 4000) return; _syncWarnAt = n;
  showToast("Network slow — sync pending, reconnecting…");
};
function showToast(msg){
  let t = document.getElementById("toast");
  if(!t){ t = document.createElement("div"); t.id="toast"; t.className="toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._timer); t._timer = setTimeout(()=>t.classList.remove("show"), 3200);
}

/* ---------- 3. HELPERS ---------- */
const $  = s => document.querySelector(s);
const chat = $("#chat");
const rupee = n => "₹" + Number(n||0).toLocaleString("en-IN");
const todayKey = ts => new Date(ts).toDateString();
const now = () => new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});

/* inline SVG icons (professional, no emoji) */
const ICON = {
  send:'<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/>',
  package:'<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  chart:'<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  cart:'<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 2h2l2.7 12.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 1.9-1.6L22 6H5"/>',
  share:'<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>',
  undo:'<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  doc:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/>',
  location:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  plus:'<line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  list:'<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
};
function svg(name, size=16){ return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[name]||''}</svg>`; }
const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const HINDI_NUM = {ek:1,do:2,teen:3,tin:3,char:4,chaar:4,panch:5,paanch:5,
  chhe:6,che:6,chah:6,saat:7,sat:7,aath:8,ath:8,nau:9,nou:9,das:10,dus:10,
  "एक":1,"दो":2,"तीन":3,"चार":4,"पांच":5,"पाँच":6,"छह":6,"सात":7,"आठ":8,"नौ":9,"दस":10};

// strip qty words/digits + punctuation, keep meaningful tokens
function nameTokens(s){
  return s.toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ ]+/g," ")      // punctuation → space
    .split(/\s+/)
    .filter(w => w && !/^\d+$/.test(w) && !(w in HINDI_NUM) && !["ka","ki","ke","aur","bika","bikey","becha","bech","sold","sale","de","do","do","piece","pcs","pkt"].includes(w));
}
function invFind(name){
  const inv = DB.inv;
  const n = name.toLowerCase().trim();
  if(!n) return null;
  // 1) exact
  let hit = inv.find(i => i.name.toLowerCase() === n); if(hit) return hit;
  // 2) full substring either direction
  hit = inv.find(i => { const m=i.name.toLowerCase(); return m.includes(n) || n.includes(m); }); if(hit) return hit;
  // 3) alias full-ish match
  for(const i of inv){ const al = ALIASES[i.name] || []; if(al.some(a => n.includes(a) || a.includes(n))) return i; }
  // 4) token-overlap score (handles "2 Parle-G" vs "Parle-G Biscuit")
  const toks = nameTokens(n).filter(w => w.length >= 3);
  if(!toks.length) return null;
  let best=null, bestScore=0;
  for(const i of inv){
    const m = i.name.toLowerCase();
    const al = ALIASES[i.name] || [];
    let score = 0;
    toks.forEach(tk => { if(m.includes(tk) || al.some(a => a.includes(tk) || tk.includes(a))) score++; });
    if(score > bestScore){ bestScore = score; best = i; }
  }
  return bestScore > 0 ? best : null;
}

// return ALL inventory items matching a word (for variant choices)
function invFindAll(name){
  const n = (name||"").toLowerCase().trim();
  if(!n) return [];
  const direct = DB.inv.filter(i =>
    i.name.toLowerCase().includes(n) || n.includes(i.name.toLowerCase()) ||
    (ALIASES[i.name]||[]).some(a => n.includes(a) || a.includes(n))
  );
  if(direct.length) return direct;
  // fuzzy fallback: any significant word of the OCR'd name appearing in a product
  // name or its aliases ("amul doodh" → Amul Milk, "parle biscuit" → Parle-G)
  const qt = n.split(/[^a-zऀ-ॿ0-9]+/).filter(w => w.length >= 3);
  if(!qt.length) return [];
  return DB.inv.filter(i => {
    const hayTokens = (i.name + " " + (ALIASES[i.name]||[]).join(" ")).toLowerCase().split(/[^a-z0-9ऀ-ॿ]+/);
    // token equality OR shared 4-letter prefix → "maggie"≈"maggi", "biscit"≈"biscuit"
    return qt.some(w => hayTokens.some(h =>
      h === w ||
      (w.length >= 4 && h.length >= 4 && h.slice(0,4) === w.slice(0,4))
    ));
  });
}

/* ---------- 4. UI RENDERERS ---------- */
function bubble(text, who="bot"){
  const d = document.createElement("div");
  d.className = `msg ${who}`;
  d.innerHTML = `${text}<span class="t">${now()}</span>`;
  chat.appendChild(d); scroll();
  return d;
}
function typing(){
  const d = document.createElement("div");
  d.className = "msg bot"; d.id = "typing";
  d.innerHTML = `<span class="typing"><i></i><i></i><i></i></span>`;
  chat.appendChild(d); scroll(); return d;
}
// double-pass scroll: once now, once after layout settles (images/cards change height
// AFTER append — a single immediate scroll left the card's buttons below the fold)
const scroll = () => {
  requestAnimationFrame(() => { chat.scrollTop = chat.scrollHeight; });
  setTimeout(() => { chat.scrollTop = chat.scrollHeight; }, 180);
};

// Shared invoice body: shop header, bill no, date-time, itemised rows, GST summary.
// Used by new bills, re-opened saved bills — one format everywhere.
function billCardHTML(items, totals, opts){
  const o = opts || {};
  const shop = (CURRENT && CURRENT.shopName) || CFG.STORE_NAME || "BillHero";
  const city = (CURRENT && CURRENT.city) || "";
  const d = new Date(o.ts || Date.now());
  const qty = items.reduce((s,i)=>s+(i.qty||0),0);
  const rows = items.map(i => `
    <div class="bill-row ${i.missing?'warn':''}">
      <div class="nm">${esc(i.name)}<span class="q">${i.qty} × ${rupee(i.price)}${i.missing?' • bhav daalein':''}</span></div>
      <div>${rupee(i.lineTotal)}</div>
    </div>`).join("");
  return `
    <div class="bill-shop"><b>${esc(shop)}</b><small>${city ? esc(city) + " · " : ""}TAX INVOICE</small></div>
    <div class="bill-head"><b>${o.no ? "Bill #"+o.no : "New Bill"}</b><span>${d.toLocaleDateString("en-IN")} · ${d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span></div>
    <div class="bill-cols"><span>Item · Qty × Rate</span><span>Amount</span></div>
    <div class="bill-rows">${rows}</div>
    <div class="bill-sum">
      <div><span>Items: ${items.length} · Total Qty: ${qty}</span><span></span></div>
      <div><span>Sub-total</span><span>${rupee(totals.sub)}</span></div>
      <div><span>GST (${Math.round(GST_RATE*100)}%)</span><span>${rupee(totals.gst)}</span></div>
      <div class="total"><span>Total</span><span>${rupee(totals.total)}</span></div>
    </div>`;
}

function renderBill(items, autoConfirm){
  // items: [{name, qty, price, lineTotal, missing}]
  const sub = items.reduce((s,i)=>s+i.lineTotal,0);
  const gst = Math.round(sub * GST_RATE);
  const total = sub + gst;
  const id = "bill_" + Date.now();
  const el = document.createElement("div");
  el.className = "bill"; el.id = id;
  el.innerHTML = billCardHTML(items, {sub, gst, total}, {}) + `
    <div class="bill-actions">
      <button class="btn-cancel">Cancel</button>
      <button class="btn-confirm">${svg('check')} Confirm ${rupee(total)}</button>
    </div>
    <div class="bill-stamp">Bill saved • Stock updated</div>
    <div class="bill-done-actions">
      ${WA_ON ? `<button class="btn-share">${svg('share')} WhatsApp</button>` : ""}
      <button class="btn-dl">${svg('download')} Save</button>
      <button class="btn-undo">${svg('undo')} Undo</button>
    </div>
    <div class="bill-foot">Dhanyavaad! Phir aaiye</div>`;
  chat.appendChild(el); scroll();

  el.querySelector(".btn-cancel").onclick = () => { el.classList.add("done"); el.querySelector(".bill-stamp").textContent="Cancel kiya gaya"; };
  el.querySelector(".btn-confirm").onclick = () => confirmBill(el, items, {sub,gst,total});
  // ORDER phrasing → auto-confirm: invoice is final immediately (Undo stays available)
  if(autoConfirm) confirmBill(el, items, {sub,gst,total});
  return el;
}

// Unique, human-readable bill number: INV-yymmdd-NNN (NNN = today's sequence)
function makeBillNo(ts){
  const d = new Date(ts || Date.now());
  const ymd = String(d.getFullYear()).slice(2) + String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0");
  const seq = (STATE.sales||[]).filter(s => new Date(s.ts).toDateString() === d.toDateString()).length + 1;
  return `INV-${ymd}-${String(seq).padStart(3,"0")}`;
}
// bills saved before bill numbers existed → derive a stable one from their id
function billNoOf(s){
  return s.no || ("INV-" + new Date(s.ts).toISOString().slice(2,10).replace(/-/g,"") + "-" + String(s.id).slice(-3).toUpperCase());
}

function confirmBill(el, items, totals){
  const sale = { id: "s"+Date.now(), no: makeBillNo(), ts: Date.now(), items, ...totals };
  Store.recordSale(sale);                 // adds sale doc + decrements stock + bumps rollup
  el.classList.add("done","saved");
  const head = el.querySelector(".bill-head b");
  if(head) head.textContent = "Bill #" + sale.no;
  const sB = el.querySelector(".btn-share"), uB = el.querySelector(".btn-undo"), dB = el.querySelector(".btn-dl");
  if(sB) sB.onclick = () => shareBill(items, totals, sale.no);
  if(dB) dB.onclick = () => downloadBill(items, totals, sale.no, sale.ts);
  if(uB) uB.onclick = () => {
    undoSale(sale.id);
    el.classList.remove("saved");
    el.querySelector(".bill-stamp").textContent = "Bill undone • stock restored";
  };
  bubble(WA_ON
    ? `Bill <b>#${sale.no}</b> — <b>${rupee(totals.total)}</b> ✓ &nbsp;${svg('share',13)} WhatsApp / ${svg('download',13)} Save upar card par.`
    : `Bill <b>#${sale.no}</b> — <b>${rupee(totals.total)}</b> ✓ &nbsp;Invoice ke liye <b>Save</b> ya "<b>save it</b>".`, "bot");
  noteForAgent("[a bill was finalised]",
    `Bill ${sale.no} created: ${items.map(i=>`${i.name} x${i.qty}`).join(", ")} — total ₹${totals.total}. It can be re-opened (show_bill) or downloaded (download_bill).`);
}

// Download the invoice as a receipt PNG (works offline, saves to the device)
function downloadBill(items, totals, no, ts){
  try{
    const shop = (CURRENT && CURRENT.shopName) || CFG.STORE_NAME || "BillHero";
    const city = (CURRENT && CURRENT.city) || "";
    const W = 400, LH = 22;
    const H = 250 + items.length * (LH*2) + 40;
    const c = document.createElement("canvas"); c.width = W*2; c.height = H*2;
    const x = c.getContext("2d"); x.scale(2,2);
    x.fillStyle = "#ffffff"; x.fillRect(0,0,W,H);
    let y = 38;
    const hr = () => { x.strokeStyle="#c7c9d9"; x.setLineDash([3,3]); x.beginPath(); x.moveTo(22,y); x.lineTo(W-22,y); x.stroke(); x.setLineDash([]); y += 22; };
    x.textAlign = "center"; x.fillStyle = "#23255f";
    x.font = "bold 19px Menlo, monospace"; x.fillText(shop, W/2, y); y += 20;
    x.font = "11px Menlo, monospace"; x.fillStyle = "#6b6e85";
    x.fillText((city ? city + " · " : "") + "TAX INVOICE", W/2, y); y += 17;
    x.fillText("Bill No: " + (no || "—"), W/2, y); y += 15;
    x.fillText(new Date(ts || Date.now()).toLocaleString("en-IN"), W/2, y); y += 14;
    hr();
    x.textAlign = "left"; x.font = "13px Menlo, monospace";
    for(const i of items){
      x.fillStyle = "#23255f"; x.fillText(String(i.name).slice(0,30), 26, y); y += LH - 6;
      x.fillStyle = "#6b6e85"; x.fillText("   " + i.qty + " × " + rupee(i.price), 26, y);
      x.fillStyle = "#23255f"; x.textAlign = "right"; x.fillText(rupee(i.lineTotal), W-26, y);
      x.textAlign = "left"; y += LH - 2;
    }
    hr();
    const row = (l, v, bold) => {
      x.font = (bold ? "bold 16px" : "12px") + " Menlo, monospace";
      x.fillStyle = bold ? "#23255f" : "#6b6e85";
      x.fillText(l, 26, y); x.textAlign = "right"; x.fillText(v, W-26, y); x.textAlign = "left";
      y += bold ? 24 : 19;
    };
    row("Items: " + items.length + "  Qty: " + items.reduce((s,i)=>s+(i.qty||0),0), "");
    row("Sub-total", rupee(totals.sub));
    row("GST (" + Math.round(GST_RATE*100) + "%)", rupee(totals.gst));
    row("TOTAL", rupee(totals.total), true);
    hr();
    x.textAlign = "center"; x.font = "11px Menlo, monospace"; x.fillStyle = "#6b6e85";
    x.fillText("Dhanyavaad! Phir aaiye — BillHero", W/2, y);
    const a = document.createElement("a");
    a.download = (no || "bill") + ".png";
    a.href = c.toDataURL("image/png");
    a.click();
    showToast("Invoice save ho gaya — " + a.download);
  }catch(e){ console.warn("[downloadBill]", e); showToast("Download me dikkat aayi — dobara try karein"); }
}

// Re-open a SAVED bill as a proper read-only bill card (with its bill number)
function renderSavedBill(sale){
  const el = document.createElement("div");
  el.className = "bill done saved";
  el.innerHTML = billCardHTML(sale.items, {sub:sale.sub, gst:sale.gst, total:sale.total}, {no:billNoOf(sale), ts:sale.ts}) + `
    <div class="bill-stamp">Saved bill</div>
    <div class="bill-done-actions">
      ${WA_ON ? `<button class="btn-share">${svg('share')} WhatsApp</button>` : ""}
      <button class="btn-dl">${svg('download')} Save</button>
    </div>
    <div class="bill-foot">Dhanyavaad! Phir aaiye</div>`;
  chat.appendChild(el); scroll();
  const shB = el.querySelector(".btn-share");
  if(shB) shB.onclick = () =>
    shareBill(sale.items, { sub:sale.sub, gst:sale.gst, total:sale.total }, billNoOf(sale));
  el.querySelector(".btn-dl").onclick = () =>
    downloadBill(sale.items, { sub:sale.sub, gst:sale.gst, total:sale.total }, billNoOf(sale), sale.ts);
}

// "save it / download" or "whatsapp bhejo" after a bill → act on the LATEST bill
function doBillAction(kind){
  // a DRAFT bill waiting on screen? "save it" means THAT one → confirm it first
  // (recordSale updates STATE.sales synchronously, so the download below picks it up)
  const pend = chat.querySelector(".bill:not(.done) .btn-confirm");
  if(pend) pend.click();
  const sales = (STATE.sales||[]).slice().sort((a,b)=>b.ts-a.ts);
  if(!sales.length){ bubble("Abhi koi bill nahi hai jo " + (kind==="dl"?"save":"bheja") + " ja sake. Pehle bill banayein — jaise <b>2 Parle-G ka order laga do</b>."); return; }
  const s = sales[0], totals = { sub:s.sub, gst:s.gst, total:s.total };
  if(kind === "dl"){
    downloadBill(s.items, totals, billNoOf(s), s.ts);
    bubble(`Invoice <b>#${billNoOf(s)}</b> download ho gaya (${rupee(s.total)}).`);
  } else if(!WA_ON){
    bubble(`WhatsApp bhejna abhi band hai. <b>Save</b> se invoice download kar sakte hain — "<b>save it</b>" likhiye.`);
  } else {
    bubble(`Bill <b>#${billNoOf(s)}</b> WhatsApp par bhejne ke liye naam &amp; number daaliye:`);
    shareBill(s.items, totals, billNoOf(s));
  }
}

// "bill dikhao / bill 003 kholo / saare bills" → saved bills, deterministically
function doBillView(text){
  const t = text.toLowerCase();
  const sales = (STATE.sales||[]).slice().sort((a,b)=>b.ts-a.ts);
  if(!sales.length){ bubble("Abhi koi saved bill nahi hai. Pehla bill banayein — jaise <b>2 Parle-G bika</b>."); return; }
  const m = t.match(/inv-?(\d{6})-?(\d{1,4})/) || t.match(/#\s*(\d{1,4})\b/) || t.match(/bill\s*(?:no\.?|number|num)?\s*(\d{1,4})\b/);
  if(m){
    const want = (m[2] || m[1]).replace(/^0+/,"") || "0";
    const hit = sales.find(s => { const n = billNoOf(s); return n.endsWith("-" + String(want).padStart(3,"0")) || n.includes(m[0].toUpperCase()); });
    if(hit){ bubble(`Ye raha bill <b>#${billNoOf(hit)}</b>:`); renderSavedBill(hit); return; }
    bubble("Is number ka bill nahi mila. <b>saare bills</b> bolkar list dekh lijiye.");
    return;
  }
  if(/\b(sab|saare|sare|sabhi|history|list|recent|aaj ke)\b/.test(t)){
    renderList(`Recent Bills — ${Math.min(sales.length,8)}`,
      sales.slice(0,8).map(s=>({ name:`#${billNoOf(s)}<br><small>${new Date(s.ts).toLocaleString("en-IN")}</small>`, val:rupee(s.total), ok:true })));
    bubble(`Kisi ek ko kholne ke liye: <b>bill ${billNoOf(sales[0]).slice(-3)} dikhao</b>`);
    return;
  }
  bubble("Ye raha aapka latest bill:");
  renderSavedBill(sales[0]);
}

// Build the bill text for WhatsApp
function buildBillText(items, totals, no){
  const store = (CURRENT && CURRENT.shopName) || CFG.STORE_NAME || "BillHero";
  const city  = (CURRENT && CURRENT.city) || "";
  const hr = "----------------------------";
  const qty = items.reduce((s,i)=>s+(i.qty||0),0);
  const lines = items.map(i=>`${i.name}\n   ${i.qty} × ${rupee(i.price)}  =  ${rupee(i.lineTotal)}`).join("\n");
  return `*${store}*${city ? "\n" + city : ""}\n~ TAX INVOICE ~${no ? "\nBill No: " + no : ""}\n${new Date().toLocaleString("en-IN")}\n${hr}\n${lines}\n${hr}\nItems: ${items.length}  |  Qty: ${qty}\nSub-total: ${rupee(totals.sub)}\nGST (${Math.round(GST_RATE*100)}%): ${rupee(totals.gst)}\n*Total: ${rupee(totals.total)}*\n${hr}\nDhanyavaad! Phir aaiye\n_— BillHero_`;
}
// Open WhatsApp — to a specific number if given
function sendWhatsApp(text, phone){
  const enc = encodeURIComponent(text);
  if(phone){ const num = phone.length===10 ? "91"+phone : phone; window.open(`https://wa.me/${num}?text=${enc}`, "_blank"); }
  else if(navigator.share){ navigator.share({ text }).catch(()=>{}); }
  else window.open(`https://wa.me/?text=${enc}`, "_blank");
}
// Save / update a customer record
function saveCustomer(name, phone, amount){ Store.upsertCustomer(name, phone, amount); }
// Share flow → ask customer name + number first
function shareBill(items, totals, no){
  const bd = document.createElement("div"); bd.className="sheet-backdrop"; bd.id="billsheet";
  bd.innerHTML = `
    <div class="sheet">
      <div class="sheet-logo">${svg('share',22)}</div>
      <h3>Send bill on WhatsApp</h3>
      <p>Customer ka naam &amp; number — record save ho jayega</p>
      <input id="custName" class="cust-in" placeholder="Customer name (optional)" autocomplete="off" />
      <input id="custPhone" class="cust-in" type="tel" inputmode="numeric" maxlength="10" placeholder="WhatsApp number (10 digit)" autocomplete="off" />
      <button class="loc-btn" id="sendWa">${svg('share')} Send &amp; Save</button>
      <button class="ghost-btn" id="justShare">Bina number ke share karein</button>
    </div>`;
  document.body.appendChild(bd);
  bd.addEventListener("click", e=>{ if(e.target===bd) bd.remove(); });
  $("#custName").focus();

  $("#sendWa").onclick = () => {
    const name  = $("#custName").value.trim();
    const phone = $("#custPhone").value.replace(/\D/g,"");
    if(phone.length !== 10){ const p=$("#custPhone"); p.classList.add("err"); p.focus(); return; }
    saveCustomer(name, phone, totals.total);
    sendWhatsApp(buildBillText(items, totals, no), phone);
    bd.remove();
    bubble(`Bill ${name ? name+" ko " : ""}bhej diya — customer record save ho gaya.`);
  };
  $("#justShare").onclick = () => { sendWhatsApp(buildBillText(items, totals, no), null); bd.remove(); };
}

// View saved customers
function doCustomers(){
  const list = DB.customers.slice().sort((a,b)=>b.ts-a.ts);
  if(!list.length){ bubble("Abhi koi customer record nahi. Bill share karte waqt naam/number save hota hai."); return; }
  const rows = list.map(c=>`
    <div class="li"><span>${esc(c.name)}<br><small>${esc(c.phone)} · ${c.bills} bills</small></span><b>${rupee(c.spent)}</b></div>`).join("");
  const el=document.createElement("div"); el.className="listcard"; el.innerHTML=`<h4>${svg('users')} Customers — ${list.length}</h4>${rows}`;
  chat.appendChild(el); scroll();
}

// Undo a saved sale → restore stock, remove record, reverse rollup
function undoSale(id){
  const sale = Store.removeSale(id);
  if(!sale){ bubble("Undo karne ke liye koi bill nahi mila."); return; }
  bubble(`Bill undo ho gaya — ${rupee(sale.total)} hataya, stock wapas add hua.`);
}

function renderList(title, rows){
  const el = document.createElement("div");
  el.className = "listcard";
  el.innerHTML = `<h4>${title}</h4>` + rows.map(r=>`
    <div class="li ${r.ok?'ok':''}">
      <span>${r.name}</span><b>${r.val}</b>
    </div>`).join("");
  chat.appendChild(el); scroll();
}

/* ---------- 5. DETERMINISTIC PARSER (offline brain) ---------- */
function detectIntent(text){
  const t = text.toLowerCase();
  // advice / opinion / open-ended → always let the AI agent handle it (don't shortcut to a card),
  // UNLESS the message also records a sale/stock (has items) — then it's a command.
  if((/\b(salah|salaah|advice|suggest|suggestion|tip|tips|improve|behtar|badhau|badhana|badhane|kya karu|kaise karu|kaise badhe|kaisa chal|kaisa raha|kaisa chal raha|opinion|recommend|growth|strategy|sochta|idea)\b/.test(t) || /सलाह|सुझाव|राय/.test(t)) && !extractItems(text).length)
    return "unknown";
  // follow-ups to a fresh bill: "save it / download karo" → PNG; "whatsapp bhejo" → share sheet
  if(/\b(save|download|dawnload|saev)\b/.test(t) && !extractItems(text).length && !/customer|chat|stock|photo/.test(t))
    return "bill_dl";
  if(/\b(whatsapp|watsapp|vhatsapp)\b/.test(t) && /bhej|send|share|karo|kar do|pe|par|it/.test(t) && !extractItems(text).length)
    return "bill_wa";
  if(/\b(bill|invoice)\b/.test(t) && /\bbhej(o| do|do| dijiye)?\b|send/.test(t) && !extractItems(text).length)
    return "bill_wa";
  // view a SAVED bill ("bill dikhao", "bill 003 kholo", "saare bills") — before undo,
  // so "last bill dikhao" shows it instead of deleting it
  if(/\b(bill|bills|बिल)\b/.test(t)
     && /(dikha|dekh|khol|open|show|print|reprint|dobara|history|list|saare bill|sare bill|#\s*\d|no\.?\s*\d|number\s*\d|\b\d{3}\b)/.test(t)
     && !/\b(bana|banao|banado|create|naya bill|new bill|undo|hatao|cancel)\b/.test(t))
    return "bill_view";
  if(/\b(undo|galti|galat ho|pichla bill|last bill|bill hatao|bill cancel|reverse|wapas karo|wapis)\b/.test(t) || /वापस|गलती|पिछला बिल/.test(t))
    return "undo";
  // customers BEFORE stock view — "customer dikhao" must not fall into the bare "dikhao" net
  if(/\b(customer|customers|grahak|graahak|customer list|customer record|regular customer)\b/.test(t) || /ग्राहक|कस्टमर/.test(t))
    return "customers";
  // stock view / per-product stock question (verb STEMS: bata covers batao/bata do/bataiye…)
  if(/\b(inventory|stock list|poora stock|saara stock|saara maal|sab saman|kitna stock)\b/.test(t)
     || /stock\s+\S*\s*(dikha|bata(?!t)|dekh)|stock (dikha|bata(?!t))|\bdikhao\b|maal dikha|saman dikha|stock hai|stock kitn|kitna bacha|kitni bachi/.test(t)
     || /स्टॉक (दिखा|बता)|सारा माल|सामान दिखा/.test(t)){
    return extractItems(text).length ? "item_info" : "inventory";   // specific product → precise answer; else full card
  }
  // per-product price question → precise answer from inventory
  if(/\b(price|rate|bhav|kimat|keemat|daam|kitne ka|kitne me)\b/.test(t) || /भाव|कीमत|दाम/.test(t)){
    if(extractItems(text).length) return "item_info";
  }
  if(/\b(customer|customers|grahak|graahak|customer list|customer record|regular customer)\b/.test(t) || /ग्राहक|कस्टमर/.test(t))
    return "customers";
  if(/\b(report|hisab|hisaab|summary|weekly|week|hafta|hafte|mahina|monthly)\b/.test(t) || /रिपोर्ट|हिसाब|हफ्ते|महीना/.test(t))
    return "report";
  if(/\b(khatam|khatm|kam ho|low|reorder|order karna|khatm hone|stock kam|kya mangwa|kya laana|kya order)\b/.test(t) || /कम हो|खत्म|क्या मंगवा|क्या लाना/.test(t))
    return "low_stock";
  if(/\b(aaya|aya|aayi|add stock|stock add|purchase|khareeda|kharida|mangwaya|receive|aa gaya)\b/.test(t) || /आया|आयी|स्टॉक जोड़/.test(t))
    return "add_stock";
  // question detector: "Lays ka stock kitna hai?", "price kya hai?" are QUESTIONS,
  // never sales — route them to the agent for a precise data answer
  const isQuestion = /\?|\b(kitna|kitni|kitne|kya|kaun|kaunsa|kaunse|kab|kaise|kyun|kahan|kidhar|available|price|rate|bhav|check)\b/.test(t)
                  || /\bbata(?!t)/.test(t) || /\bdikha/.test(t)      // stems: bata do, batao, dikhana, dikhao…
                  || /कितना|कितनी|कितने|क्या|कौन|कब|कैसे|कहाँ|भाव|कीमत|बता|दिखा/.test(t);

  if(/\b(becha|bika|bikey|bik gaya|sold|sale|kitna becha|kitna bika|kitna kamaya|kitna hua|total sale|kamaya|revenue|income|profit|dhanda)\b/.test(t) || /बेचा|बिका|कितना बेचा|कमाया/.test(t)){
    const hasItems = extractItems(text).length > 0;
    if(!hasItems) return "query_sales";              // "aaj kitna becha" → today's sales card
    return isQuestion ? "unknown" : "sale";          // "Parle-G kitna bika?" → agent; "2 Parle-G bika" → bill
  }
  // "order laga do / chahiye / mangwa" = a CUSTOMER ordering → straight to the bill
  const itemsN = extractItems(text).length;
  return (itemsN && !isQuestion) ? "sale" : "unknown";
}

function extractItems(text){
  // POSITION-based extraction: finds EVERY product mention in the sentence
  // (no commas/aur needed — voice transcripts often lack them), and pairs each
  // with the quantity written just BEFORE it (else just after, else 1).
  const t = text.toLowerCase();
  const found = [];     // {item, pos, len}
  const claimed = [];   // text spans already matched
  const isWordChar = ch => ch && /[a-zऀ-ॿ]/.test(ch);

  // build needles: full names, aliases, and significant name-tokens — longest first
  const needles = [];
  for(const it of DB.inv){
    needles.push({ n: it.name.toLowerCase(), item: it });
    for(const a of (ALIASES[it.name] || [])) needles.push({ n: a.toLowerCase(), item: it });
    nameTokens(it.name).filter(w => w.length >= 4).forEach(w => needles.push({ n: w, item: it }));
  }
  needles.sort((a,b) => b.n.length - a.n.length);

  for(const nd of needles){
    if(found.some(f => f.item === nd.item)) continue;          // one entry per product
    let idx = 0;
    while(true){
      const p = t.indexOf(nd.n, idx);
      if(p < 0) break;
      idx = p + nd.n.length;
      if(isWordChar(t[p-1]) || isWordChar(t[p + nd.n.length])) continue;          // word boundaries
      if(claimed.some(([a,b]) => p < b && p + nd.n.length > a)) continue;         // span already taken
      claimed.push([p, p + nd.n.length]);
      found.push({ item: nd.item, pos: p, len: nd.n.length });
      break;
    }
  }
  found.sort((a,b) => a.pos - b.pos);

  return found.map(f => {
    const before = t.slice(Math.max(0, f.pos - 10), f.pos);
    const after  = t.slice(f.pos + f.len, f.pos + f.len + 10);
    let qty = null;
    let m = before.match(/(\d+)\s*$/);                                   // "2 Parle-G"
    if(m) qty = parseInt(m[1]);
    if(qty == null){
      for(const [w,v] of Object.entries(HINDI_NUM)){
        if(new RegExp("\\b" + w + "\\s*$").test(before)){ qty = v; break; }   // "do Parle-G"
      }
    }
    if(qty == null){ m = after.match(/^\s*[x×]\s*(\d+)/); if(m) qty = parseInt(m[1]); }  // "Parle-G x2"
    return { item: f.item, qty: qty || 1 };
  });
}

/* ---------- 6. ACTIONS ---------- */
function doSale(parsed, aiReply, auto){
  // parsed: [{name, qty}] (from AI) OR [{item,qty}] (from offline)
  const inv = DB.inv;
  const items = parsed.map(p=>{
    const row = p.item || inv.find(i=>i.name===p.name) || invFind(p.name||"");
    const price = row ? row.price : 0;
    const name  = row ? row.name : (p.name||"Item");
    const qty = p.qty||1;
    return { name, qty, price, lineTotal: price*qty, missing: !row };
  });
  if(!items.length){ bubble("Samajh nahi aaya — kaunsa saamaan bika? Jaise: <b>2 Parle-G, 1 Maggi</b>"); return; }
  // auto-confirm only when every item matched the inventory (unknown item → keep draft to fix price)
  const canAuto = !!auto && items.every(i => !i.missing);
  if(!canAuto) bubble(aiReply || "Ye lijiye bill — pakka karne ke liye tap karein ");   // auto mode: card + one line, no extra chatter
  renderBill(items, canAuto);
}

function doAddStock(parsed, aiReply){
  const entries = parsed.map(p=>({ name: (p.item ? p.item.name : p.name) || "", qty: p.qty||1 }));
  const changed = Store.addStock(entries);
  if(!changed.length){ bubble("Kaunsa saamaan aaya? Jaise: <b>10 Maggi aaya</b>"); return; }
  const msg = changed.map(c=>`${esc(c.name)}: +${c.delta} (now ${c.stock})`).join("<br>");
  bubble((aiReply || "Stock update ho gaya") + "<br>" + msg);
}

function doQuerySales(aiReply){
  const r = STATE.rollups[dateKey(Date.now())] || { total:0, bills:0, items:{} };
  if(!r.bills){ bubble("Aaj abhi tak koi sale nahi hui. Pehla bill banayein."); return; }
  const top = Object.entries(r.items).sort((a,b)=>b[1]-a[1]).slice(0,3);
  renderList(`Aaj ki Sale — ${rupee(r.total)} (${r.bills} bills)`,
    top.map(([n,q])=>({name:n, val:q+" sold", ok:true})) );
  bubble(aiReply || `Aaj <b>${rupee(r.total)}</b> ka dhanda hua — ${r.bills} bills.`);
}

function doLowStock(aiReply){
  const low = DB.inv.filter(i=>i.stock<=i.low).sort((a,b)=>a.stock-b.stock);
  if(!low.length){ bubble("Sab stock theek hai kuch bhi khatam nahi ho raha."); return; }
  // suggest a reorder quantity: restock to ~3x the alert level
  const plan = low.map(i=>{
    const target = i.low * 3;
    const orderQty = Math.max(target - i.stock, i.low);
    return { ...i, orderQty };
  });
  renderReorder(plan);
  const summary = plan.slice(0,4).map(p=>`${esc(p.name)} ×${p.orderQty}`).join(", ");
  bubble(aiReply || `Aaj ye order kar dijiye: <b>${summary}</b>${plan.length>4?` +${plan.length-4} aur`:""}.`);
  noteForAgent("[asked what is running low]",
    `App showed low-stock card: ${plan.map(p=>`${p.name} (${p.stock} left, suggest order ${p.orderQty})`).join(", ")}.`);
}
function renderReorder(plan){
  const rows = plan.map(p=>`
    <div class="li">
      <span>${esc(p.name)}<br><small>abhi: ${p.stock} ${esc(p.unit)}</small></span>
      <b class="order-qty">Order ×${p.orderQty}</b>
    </div>`).join("");
  const el=document.createElement("div"); el.className="listcard reorder";
  el.innerHTML=`<h4>${svg('cart')} Reorder suggestion — ${plan.length} items</h4>${rows}`;
  chat.appendChild(el); scroll();
}

function invRowHTML(i){
  return `<span>${esc(i.name)}<br><small>₹${i.price} · ${i.stock} ${i.unit}${i.stock<=i.low?' · low':''}</small></span><b>${i.stock}</b>`;
}
function doInventory(){
  const inv = DB.inv;
  const rows = inv.map(i=>`<div class="li tap ${i.stock<=i.low?'low':''}" data-name="${encodeURIComponent(i.name)}">${invRowHTML(i)}</div>`).join("");
  const el=document.createElement("div"); el.className="listcard inv";
  el.innerHTML=`<h4>${svg('package')} Stock — ${inv.length} items</h4><div class="inv-scroll">${rows||'<div class="li"><span>No products yet — tap + to add</span></div>'}</div>`;
  chat.appendChild(el); scroll();
  el.querySelectorAll(".li.tap").forEach(r => r.onclick = () => openEditProduct(decodeURIComponent(r.dataset.name), r));
  const lows = inv.filter(i=>i.stock<=i.low);
  bubble((lows.length ? `${lows.length} item low hain. ` : "") + "Kisi product ko edit ya delete karne ke liye us par tap karein.");
  noteForAgent("[asked to see the stock list]",
    `App showed the full stock card (${inv.length} items). Low-stock items: ${lows.map(i=>`${i.name} (${i.stock} left, reorder at ${i.low})`).join(", ") || "none"}.`);
}

function rollupRange(days){
  let total=0, bills=0; const items={};
  for(let i=0;i<days;i++){ const r=STATE.rollups[dateKey(Date.now()-i*86400000)]; if(r){ total+=r.total; bills+=r.bills; for(const n in r.items) items[n]=(items[n]||0)+r.items[n]; } }
  return { total, bills, items };
}
function doReport(aiReply){
  const today = STATE.rollups[dateKey(Date.now())] || { total:0, bills:0, items:{} };
  const wk = rollupRange(7);
  const top = Object.entries(wk.items).sort((a,b)=>b[1]-a[1]).slice(0,3);
  renderReport({ todayTotal:today.total, todayBills:today.bills, weekTotal:wk.total, weekBills:wk.bills, top });
  bubble(aiReply || (wk.bills
    ? `Is hafte <b>${rupee(wk.total)}</b> ka business hua — ${wk.bills} bills.`
    : "Abhi tak koi sale record nahi hui. Pehla bill banayein."));
}
function renderReport(r){
  const topRows = r.top.length
    ? r.top.map((t,i)=>`<div class="li ok"><span>#${i+1}&nbsp; ${t[0]}</span><b>${t[1]} sold</b></div>`).join("")
    : `<div class="li"><span>Abhi koi sale nahi</span><b>—</b></div>`;
  const el=document.createElement("div"); el.className="listcard report";
  el.innerHTML=`<h4>${svg('chart')} Business Report</h4>
    <div class="rep-grid">
      <div class="rep-cell"><span class="rep-val">${rupee(r.todayTotal)}</span><span class="rep-lbl">Aaj · ${r.todayBills} bills</span></div>
      <div class="rep-cell"><span class="rep-val">${rupee(r.weekTotal)}</span><span class="rep-lbl">Is hafte · ${r.weekBills} bills</span></div>
    </div>
    <div class="rep-top-h">Top sellers (7 days)</div>
    ${topRows}`;
  chat.appendChild(el); scroll();
}

/* ---------- 7. AI LAYER (Gemini, optional) ---------- */
async function askGemini(text){
  const inv = DB.inv.map(i=>`${i.name} (₹${i.price}, stock ${i.stock})`).join("; ");
  const sys = `You are BillHero, a billing assistant for a small Indian kirana shop. The shopkeeper may write in any Indian language. Current inventory: ${inv}.
Classify the message and extract items. Match item names to the inventory above (return the inventory's English name in "name"). The 'reply' text MUST be written in ${CUR.gName} and be a short, friendly one-line confirmation. Respond ONLY with JSON.`;
  const schema = {
    type:"object",
    properties:{
      intent:{type:"string",enum:["sale","add_stock","query_sales","low_stock","report","inventory","undo","customers","unknown"]},
      items:{type:"array",items:{type:"object",properties:{
        name:{type:"string"}, qty:{type:"number"}
      }, required:["name","qty"]}},
      reply:{type:"string"}
    },
    required:["intent","items"]
  };
  const body = {
    systemInstruction:{parts:[{text:sys}]},
    contents:[{role:"user",parts:[{text}]}],
    generationConfig:{ responseMimeType:"application/json", responseSchema:schema, temperature:0.1 }
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), 8000); // never hang the demo
  const res = await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:ctrl.signal});
  clearTimeout(timer);
  if(!res.ok) throw new Error("gemini "+res.status);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return JSON.parse(raw);
}

/* ---------- 7b. VISION / HANDWRITING OCR (Gemini multimodal) ---------- */
function fileToDataURL(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
}
function imageBubble(dataUrl){
  const d=document.createElement("div"); d.className="msg me img-msg";
  d.innerHTML=`<img src="${dataUrl}" alt="customer list"/><span class="t">${now()}</span>`;
  chat.appendChild(d); scroll();
  const im = d.querySelector("img");
  if(im) im.onload = scroll;   // image height arrives late → re-scroll so nothing below is hidden
}

// shrink the photo to ≤1280px JPEG before sending to AI: 5-10x smaller upload,
// faster + cheaper OCR, same read quality for a shopping list
async function prepImage(dataUrl){
  try{
    const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=dataUrl; });
    const MAX = 1280, sc = Math.min(1, MAX/Math.max(img.width, img.height));
    if(sc >= 1 && dataUrl.startsWith("data:image/jpeg")) return { b64:dataUrl.split(",")[1], mime:"image/jpeg" };
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width*sc)); c.height = Math.max(1, Math.round(img.height*sc));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const out = c.toDataURL("image/jpeg", 0.85);
    return { b64: out.split(",")[1], mime: "image/jpeg" };
  }catch(e){
    return { b64: dataUrl.split(",")[1], mime: (dataUrl.slice(5).split(";")[0]) || "image/jpeg" };
  }
}
function visionPrompt(){
  const inv = DB.inv.map(i=>i.name).join("; ");
  return `This image is a handwritten shopping/product list from a customer. The handwriting may be in Hindi, Hinglish, or a regional language and can be messy. Read it carefully and extract EVERY product line with its quantity (default 1 if none written). Write every product name in ROMAN (English) letters — transliterate Hindi/regional words (दूध → doodh, आटा → atta) — and use simple common spellings (e.g. "milk", "atta", "biscuit", "namak"). If a line closely matches one of the shop's products, use that product's words. Our shop stocks: ${inv}. Return ONLY JSON like {"items":[{"name":"...","qty":1}]}.`;
}
function extractJSON(txt){ try{ return JSON.parse(txt); }catch(e){ const m=(txt||"").match(/\{[\s\S]*\}/); if(m){ try{ return JSON.parse(m[0]); }catch(_){} } return {}; } }
async function aiVision(base64, mime){
  return AI_PROVIDER==="openrouter" ? aiVisionOpenRouter(base64, mime) : aiVisionGemini(base64, mime);
}
async function aiVisionGemini(base64, mime){
  const schema={type:"object",properties:{items:{type:"array",items:{type:"object",properties:{name:{type:"string"},qty:{type:"number"}},required:["name","qty"]}}},required:["items"]};
  const body={ contents:[{role:"user",parts:[{text:visionPrompt()},{inlineData:{mimeType:mime,data:base64}}]}], generationConfig:{responseMimeType:"application/json",responseSchema:schema,temperature:0.1} };
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),15000);
  const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:ctrl.signal});
  clearTimeout(timer); if(!res.ok) throw new Error("vision "+res.status);
  const data=await res.json(); const raw=data.candidates?.[0]?.content?.parts?.[0]?.text||"{}";
  return extractJSON(raw).items || [];
}
async function aiVisionOpenRouter(base64, mime){
  const messages=[{ role:"user", content:[ {type:"text",text:visionPrompt()}, {type:"image_url",image_url:{url:`data:${mime};base64,${base64}`}} ] }];
  const call = async model => {
    const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),35000);  // vision can be slow; don't self-abort early
    try{
      const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",
        headers:{ "Authorization":"Bearer "+OPENROUTER_API_KEY, "Content-Type":"application/json", "HTTP-Referer":"https://billhero.app", "X-Title":"BillHero" },
        body:JSON.stringify({ model, messages, temperature:0.1 }), signal:ctrl.signal });
      if(!res.ok) throw new Error("vision "+res.status);
      const data=await res.json(); const raw=contentToText(data.choices?.[0]?.message?.content)||"{}";
      return extractJSON(raw).items || [];
    } finally { clearTimeout(timer); }
  };
  const primary = CFG.OCR_MODEL || OPENROUTER_MODEL;
  const fb = CFG.OCR_FALLBACK || CFG.TRANSCRIBE_FALLBACK;
  try{
    const items = await call(primary);
    if(items.length || !fb) return items;
    console.warn("[vision] primary read 0 items → trying fallback model");
    return await call(fb);
  }catch(e){
    if(!fb) throw e;
    console.warn("[vision] primary failed → fallback:", e.message);
    return await call(fb);
  }
}
async function handleImage(file){
  if(!file) return;
  console.info("[image] received:", file.name || "pasted", file.type, Math.round(file.size/1024) + "KB");
  const dataUrl = await fileToDataURL(file);
  imageBubble(dataUrl);
  if(!AI_ENABLED){
    bubble("Image padhne ke liye AI chahiye. <b>config.js</b> me key daalein, phir dobara bhejein.");
    return;
  }
  const t=typing();
  try{
    const prep = await prepImage(dataUrl);          // downscale → much faster OCR
    const items = await aiVision(prep.b64, prep.mime);
    t.remove();
    if(!items.length){ bubble("Is image me koi list nahi mili. Saaf, seedhi photo bhejein."); return; }
    renderOcr(items);   // renders the card AND the right instruction for what it found
  }catch(e){ t.remove(); console.warn("vision fell back:",e.message); bubble("Image padhne me dikkat aayi — thodi der baad ya saaf photo se try karein."); }
}
let LAST_OCR = null;   // the live list card — lets chat messages correct quantities before billing

// Deterministic cards are invisible to the chat AI — record a compact summary in its
// history so follow-ups ("kaun sa match nahi hua?", "kaun sa low hai?") get real answers.
function noteForAgent(userText, botSummary){
  agentHistory = agentHistory.concat([
    { role:"user", content:userText },
    { role:"assistant", content:botSummary }
  ]).slice(-8);
}

// "Maggi 5 kar do / maggi ko 5 karo, order place kar do" while a list card is open
// → update that line's qty on the card (and optionally bill immediately)
function tryOcrCorrection(text){
  if(!LAST_OCR || !LAST_OCR.el.isConnected) return false;
  const btn = LAST_OCR.el.querySelector(".btn-makebill");
  if(!btn || btn.disabled){ LAST_OCR = null; return false; }
  // needs correction/order context — a plain new sale ("2 parle bika") must NOT be hijacked
  if(!/(kar do|karde|kardo|karo|badal|change|se \d|nahi|nahin|order|place|create|bana|sahi|theek|thik|bilkul|haan|ok|yes|कर दो|करदो|बदल|ऑर्डर|प्लेस|नहीं|सही|ठीक|बना|हाँ)/i.test(text)) return false;
  const items = extractItems(text);
  if(!items.length){
    // no product named = pure confirmation: "bilkul sahi hai, order create kar do" → press Create Bill
    const confirms = /(create|bana|order|place|final|laga|confirm|kar do|बना|ऑर्डर|प्लेस|कर दो|लगा)/i.test(text);
    const offTopic = /(report|stock|customer|becha|bika|hisab|khatam|inventory|save|download|whatsapp|स्टॉक|रिपोर्ट|ग्राहक|बेचा)/i.test(text);
    if(confirms && !offTopic){
      bubble("Theek hai — bill bana raha hoon…");
      btn.click();
      return true;
    }
    return false;
  }
  const nums = (text.match(/\d+/g) || []).map(Number);
  let qty = nums.length ? nums[nums.length-1] : null;         // "1 se 5 kar do" → 5 (last number wins)
  if(qty == null){ for(const [w,v] of Object.entries(HINDI_NUM)){ if(new RegExp("(^|\\s)"+w+"(\\s|$)","i").test(text)){ qty = v; break; } } }
  if(qty == null || qty <= 0 || qty > 999) return false;
  const touched = [];
  for(const it of items){
    const line = LAST_OCR.lines.find(l => l.matches.some(m => m.name === it.item.name));
    if(!line) continue;
    line.qty = qty;
    const i = LAST_OCR.lines.indexOf(line);
    const tag = LAST_OCR.el.querySelector(`.ocr-row[data-i="${i}"] .ocr-tag`);
    if(tag) tag.textContent = "×" + qty;
    touched.push(line.matches[line.sel].name);
  }
  if(!touched.length) return false;
  const place = /(order|place|laga|final|bana do|banao|ऑर्डर|प्लेस|बना दो|लगा दो)/i.test(text);
  bubble(`Theek hai — <b>${touched.map(esc).join(", ")} ab ×${qty}</b>. ${place ? "Bill bana raha hoon…" : "Aur kuch badalna ho to bata dein, warna <b>Create Bill</b> dabayein."}`);
  if(place) btn.click();
  return true;
}

// A TYPED/PASTED list ("atta 2, maggi 5" / one item per line) gets the same treatment
// as a photo: stock check, mismatch flags, variant chips, corrections, Create Bill.
function parseTextList(text){
  if(/[?]/.test(text)) return null;                       // questions are never lists
  const segs = text.split(/[\n;,]+/).map(s=>s.trim()).filter(Boolean);
  if(segs.length < 2) return null;                        // one segment = a normal sentence
  const items = [];
  for(const s of segs){
    if(s.split(/\s+/).length > 5) return null;            // long segment = sentence, not a row
    if(/\b(becha|bika|bata|dikha|kitna|report|stock|order|laga|chahiye|mangwa|save|download|bill|undo|customer|whatsapp)\b/i.test(s)) return null;
    let name, qty;
    let m = s.match(/^(\d+)\s+([a-zA-Zऀ-ॿ][a-zA-Zऀ-ॿ\s\-\.']*)$/);                    // "2 maggi"
    if(m){ qty = parseInt(m[1]); name = m[2].trim(); }
    else{
      m = s.match(/^([a-zA-Zऀ-ॿ][a-zA-Zऀ-ॿ\s\-\.']*?)\s*[-:x×]?\s*(\d+)?\s*(kg|gm|g|ml|ltr|l|packet|pkt|pc|pcs)?\.?$/i);  // "maggi 5" / "atta - 2 kg"
      if(!m) return null;
      name = m[1].trim(); qty = m[2] ? parseInt(m[2]) : 1;
    }
    if(!name || name.length < 2) return null;
    items.push({ name, qty: Math.max(1, qty || 1) });
  }
  return items.length >= 2 ? items : null;
}

function renderOcr(extracted){
  const lines = extracted.map(e=>({ raw:e.name, qty:Math.max(1,parseInt(e.qty)||1), matches:invFindAll(e.name), sel:0 }));
  const matchedCount = lines.filter(l=>l.matches.length).length;
  console.info("[ocr] read:", lines.map(l=>l.raw+"×"+l.qty).join(", "), "| matched:", matchedCount+"/"+lines.length);
  const hasVariants = lines.some(l=>l.matches.length>1);
  // always echo back EXACTLY what was read from the handwriting, line by line
  const readBack = lines.map(l=>`${esc(l.raw)} ×${l.qty}`).join("<br>• ");
  if(!matchedCount)
    bubble(`Maine aapki list padhi (${lines.length} item):<br>• <b>${readBack}</b><br>— par ye aapke stock se match nahi hue. Pehle <b>+</b> se product add karein, ya saaf naam ke saath dobara photo bhejein.`);
  else
    bubble(`Maine aapki list padhi (${lines.length} item):<br>• <b>${readBack}</b><br>${hasVariants ? "Niche variant chunke <b>Create Bill</b> dabayein." : "Niche <b>Create Bill</b> dabayein."}`);
  const rowsHtml = lines.map((l,i)=>{
    if(!l.matches.length)
      return `<div class="ocr-row miss" data-i="${i}"><span class="ocr-nm">${esc(l.raw)}</span><span class="ocr-tag">×${l.qty} • not in stock</span></div>`;
    const chips = l.matches.length>1
      ? `<div class="chips">${l.matches.map((m,j)=>`<button class="chip ${j===0?'on':''}" data-i="${i}" data-j="${j}">${esc(m.name)} · ₹${m.price}</button>`).join("")}</div>`
      : `<span class="ocr-sub">${esc(l.matches[0].name)} · ₹${l.matches[0].price} · stock ${l.matches[0].stock}</span>`;
    return `<div class="ocr-row" data-i="${i}"><div class="ocr-nm">${esc(l.raw)} <b class="ocr-tag">×${l.qty}</b>${l.matches.length>1?' <i class="varhint">variants:</i>':''}</div>${chips}</div>`;
  }).join("");
  const el=document.createElement("div"); el.className="listcard ocr";
  el.innerHTML=`<h4>${svg('doc')} Customer list read — ${matchedCount}/${lines.length} in stock</h4>${rowsHtml}
    <div class="ocr-foot"><button class="btn-makebill">${svg('check')} Create Bill (${matchedCount})</button></div>`;
  chat.appendChild(el); scroll();

  el.querySelectorAll(".chip").forEach(c=> c.onclick=()=>{
    const i=+c.dataset.i, j=+c.dataset.j; lines[i].sel=j;
    el.querySelectorAll(`.chip[data-i="${i}"]`).forEach(x=>x.classList.remove("on"));
    c.classList.add("on");
  });
  el.querySelector(".btn-makebill").onclick=()=>{
    const picked=lines.filter(l=>l.matches.length).map(l=>({ item:l.matches[l.sel], qty:l.qty }));
    if(!picked.length){ bubble("Is list ka koi item stock me nahi hai."); return; }
    // consume the card: no double-billing, and chat sync can repaint again
    el.querySelectorAll(".chip, .btn-makebill").forEach(b=>{ b.disabled=true; b.style.opacity=".55"; b.style.cursor="default"; });
    LAST_OCR = null;
    doSale(picked, `Aapki list se ${picked.length} item ka bill ready hai `, true);
  };
  LAST_OCR = { lines, el };   // chat can now correct quantities on this card
  const matchedTxt = lines.filter(l=>l.matches.length).map(l=>`${l.raw}→${l.matches[0].name} x${l.qty}`).join(", ") || "none";
  const missTxt = lines.filter(l=>!l.matches.length).map(l=>l.raw).join(", ") || "none";
  noteForAgent("[sent a photo of a customer list]",
    `App read the photo list. Matched to stock: ${matchedTxt}. NOT in stock (no match): ${missTxt}. A card with Create Bill is shown.`);
}

/* ---------- 7c. DYNAMIC AGENT (Gemini function-calling) ----------
   Handles open-ended questions — the model decides which tools to
   call over the shop's real data, then answers in natural language.
   Tools are a fixed, safe set scoped to this shop's data (no raw queries). */
let agentHistory = [];

const TOOL_DEFS = [
  { name:"get_inventory", description:"List all products currently in stock with price, quantity and unit.",
    parameters:{ type:"object", properties:{} } },
  { name:"get_low_stock", description:"Products at or below their reorder level, with a suggested reorder quantity.",
    parameters:{ type:"object", properties:{} } },
  { name:"get_sales", description:"Total sales amount and number of bills for a time period.",
    parameters:{ type:"object", properties:{ period:{ type:"string", enum:["today","week","month","all"] } }, required:["period"] } },
  { name:"get_top_items", description:"Best-selling products for a time period.",
    parameters:{ type:"object", properties:{ period:{ type:"string", enum:["today","week","month","all"] }, limit:{ type:"number" } }, required:["period"] } },
  { name:"find_customer", description:"Find saved customers by name or phone number.",
    parameters:{ type:"object", properties:{ query:{ type:"string" } }, required:["query"] } },
  { name:"list_customers", description:"List saved customers sorted by total spend.",
    parameters:{ type:"object", properties:{ limit:{ type:"number" } } } },
  { name:"create_bill", description:"Create a new sales bill for the given items; it is shown to the shopkeeper to confirm.",
    parameters:{ type:"object", properties:{ items:{ type:"array", items:{ type:"object", properties:{ name:{type:"string"}, qty:{type:"number"} }, required:["name","qty"] } } }, required:["items"] } },
  { name:"add_stock", description:"Add received stock quantity to one or more products.",
    parameters:{ type:"object", properties:{ items:{ type:"array", items:{ type:"object", properties:{ name:{type:"string"}, qty:{type:"number"} }, required:["name","qty"] } } }, required:["items"] } },
  { name:"get_bills", description:"List recent saved bills: bill number, time, total, items.",
    parameters:{ type:"object", properties:{ limit:{ type:"number", description:"max bills, default 10" } } } },
  { name:"show_bill", description:"Re-open a saved bill and show it to the shopkeeper as a bill card. Pass bill_no (e.g. INV-261121-003 or just 003), or omit it for the latest bill.",
    parameters:{ type:"object", properties:{ bill_no:{ type:"string" } } } },
  { name:"download_bill", description:"Save/download a bill's invoice as an image to the shopkeeper's device. Use when they say 'save it', 'download karo' etc. Omit bill_no for the latest bill.",
    parameters:{ type:"object", properties:{ bill_no:{ type:"string" } } } },
  { name:"whatsapp_bill", description:"Open the WhatsApp send flow for a bill (asks customer name & number, saves the customer record). Omit bill_no for the latest bill.",
    parameters:{ type:"object", properties:{ bill_no:{ type:"string" } } } },
];
const TOOL_DEFS_LIVE = WA_ON ? TOOL_DEFS : TOOL_DEFS.filter(t => t.name !== "whatsapp_bill");
const AGENT_TOOLS_GEMINI = [{ functionDeclarations: TOOL_DEFS_LIVE }];
const AGENT_TOOLS_OPENAI = TOOL_DEFS_LIVE.map(t => ({ type:"function", function:t }));

// normalize a period arg the model might send in any language
function normPeriod(p){
  const s = String(p||"").toLowerCase();
  if(/all|sab|total|poora|पूरा/.test(s)) return "all";
  if(/week|hafta|hafte|saptah|सप्ताह|हफ्त/.test(s)) return "week";
  if(/month|mahina|mahine|महीन|माह/.test(s)) return "month";
  return "today"; // default + today / aaj / आज / இன்று …
}
// each tool returns a plain object (Gemini requirement), scoped to this shop's data
function runTool(name, args){
  args = args || {};
  switch(name){
    case "get_inventory":
      return { items: DB.inv.map(i=>({name:i.name, price:i.price, stock:i.stock, unit:i.unit, low:i.stock<=i.low})) };
    case "get_low_stock":{
      const low = DB.inv.filter(i=>i.stock<=i.low);
      return { items: low.map(i=>({name:i.name, stock:i.stock, unit:i.unit, suggested_order: Math.max(i.low*3 - i.stock, i.low)})) };
    }
    case "get_sales":{
      const period = normPeriod(args.period);
      if(period==="all"){ let total=0,bills=0; for(const k in STATE.rollups){ total+=STATE.rollups[k].total; bills+=STATE.rollups[k].bills; } return { period, total, bills }; }
      const r = rollupRange(period==="today"?1:period==="week"?7:30);
      return { period, total:r.total, bills:r.bills };
    }
    case "get_top_items":{
      const period = normPeriod(args.period);
      const r = rollupRange(period==="today"?1:period==="week"?7:period==="month"?30:3650);
      const top = Object.entries(r.items).sort((a,b)=>b[1]-a[1]).slice(0, args.limit||5).map(([nm,q])=>({name:nm, qty:q}));
      return { period, items: top };
    }
    case "find_customer":{
      const q=(args.query||"").toLowerCase();
      return { matches: DB.customers.filter(c=>(c.name||"").toLowerCase().includes(q)||String(c.phone).includes(q)).slice(0,10) };
    }
    case "list_customers":
      return { customers: DB.customers.slice().sort((a,b)=>(b.spent||0)-(a.spent||0)).slice(0, args.limit||10) };
    case "create_bill":
      doSale((args.items||[]).map(x=>({name:x.name, qty:x.qty})), " ", true);
      return { status:"shown_to_user", note:"Invoice shown. It auto-finalises with a bill number when all items are in inventory; only unknown items need a manual Confirm tap." };
    case "add_stock":
      doAddStock((args.items||[]).map(x=>({name:x.name, qty:x.qty})), " ");
      return { status:"done" };
    case "create_order":{
      const order = Store.createOrder(args.items||[]);
      if(!order) return { error:"no valid items" };
      renderOrder(order);
      return { status:"order_created", id:order.id, note:"Order card shown with WhatsApp-to-supplier and goods-arrived buttons." };
    }
    case "list_orders":
      return { pending: DB.orders.filter(o=>o.status==="pending").map(o=>({ id:o.id, ts:o.ts, items:o.items })) };
    case "get_bills":{
      const sales = (STATE.sales||[]).slice().sort((a,b)=>b.ts-a.ts).slice(0, args.limit||10);
      return { bills: sales.map(s=>({ bill_no: billNoOf(s), time: new Date(s.ts).toLocaleString("en-IN"), total: s.total, items: s.items.map(i=>i.name+" x"+i.qty) })) };
    }
    case "show_bill":{
      const sales = (STATE.sales||[]).slice().sort((a,b)=>b.ts-a.ts);
      if(!sales.length) return { error:"no saved bills yet" };
      const q = String(args.bill_no||"").toUpperCase().trim();
      const hit = q ? sales.find(s => billNoOf(s).includes(q) || billNoOf(s).endsWith("-"+q.padStart(3,"0"))) : sales[0];
      if(!hit) return { error:"bill not found", hint:"call get_bills to list bill numbers" };
      renderSavedBill(hit);
      return { status:"shown_to_user", bill_no: billNoOf(hit), total: hit.total };
    }
    case "download_bill": case "whatsapp_bill": {
      const pend = chat.querySelector(".bill:not(.done) .btn-confirm");
      if(pend) pend.click();   // a draft on screen is what "save it" refers to → finalise it first
      const sales = (STATE.sales||[]).slice().sort((a,b)=>b.ts-a.ts);
      if(!sales.length) return { error:"no saved bills yet" };
      const q = String(args.bill_no||"").toUpperCase().trim();
      const hit = q ? sales.find(s => billNoOf(s).includes(q) || billNoOf(s).endsWith("-"+q.padStart(3,"0"))) : sales[0];
      if(!hit) return { error:"bill not found", hint:"call get_bills to list bill numbers" };
      const totals = { sub:hit.sub, gst:hit.gst, total:hit.total };
      if(name === "download_bill"){ downloadBill(hit.items, totals, billNoOf(hit), hit.ts); return { status:"downloaded", bill_no: billNoOf(hit) }; }
      if(!WA_ON) return { error:"whatsapp feature is turned off right now; suggest download_bill instead" };
      shareBill(hit.items, totals, billNoOf(hit));
      return { status:"whatsapp_sheet_opened", bill_no: billNoOf(hit), note:"Sheet asks customer name & number; record will be saved." };
    }
    default:
      return { error:"unknown tool" };
  }
}

function agentSystem(){
  return `You are BillHero, an assistant for a small Indian kirana (grocery) shop owner.
RULES:
- You have NO knowledge of this shop's sales, stock, or customers on your own. You MUST call a tool to get any number, product, or customer. NEVER state a figure you did not receive from a tool.
- If a tool returns empty or zero, say so plainly (e.g. "abhi koi data nahi"). Do not make up data.
- Call get_sales/get_top_items for sales questions, get_inventory/get_low_stock for stock, find_customer/list_customers for customers.
- To record a sale or received stock, call create_bill or add_stock.
- Saved bills CAN be re-opened (show_bill) or downloaded as an invoice image (download_bill)${WA_ON ? " or sent on WhatsApp (whatsapp_bill)" : ""} — each defaults to the LATEST bill if no number is given. "save it / download" after a bill → download_bill.${WA_ON ? "" : " WhatsApp sending is turned off right now — if asked, say so and offer download_bill."} Every bill has a unique number like INV-261121-003.
- "Order laga do / order karna / chahiye / mangwa" means a CUSTOMER is ordering products → call create_bill with those items. Goods ARRIVING at the shop ("X aaya") → add_stock. If truly unclear, ask ONE short clarifying question.
- You CANNOT see images in this chat. If the user mentions a photo/image/list to read, tell them: tap the CAMERA icon next to the message box, or paste/drag the image into the app — it reads lists automatically. Do not ask them to type the items out.
- Be short, warm, practical. Reply in ${CUR.gName}. Use ₹ for money. Today's date: ${new Date().toDateString()}.`;
}
// dispatch to the configured provider
async function askAgent(text){
  return AI_PROVIDER === "openrouter" ? askAgentOpenRouter(text) : askAgentGemini(text);
}

/* --- Provider A: Google Gemini (direct) --- */
async function geminiGenerate(contents){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = { systemInstruction:{parts:[{text:agentSystem()}]}, contents, tools: AGENT_TOOLS_GEMINI, generationConfig:{ temperature:0.1 } };
  const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),15000);
  const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:ctrl.signal});
  clearTimeout(timer);
  if(!res.ok) throw new Error("gemini "+res.status);
  return res.json();
}
async function askAgentGemini(text){
  const contents = agentHistory.concat([{ role:"user", parts:[{text}] }]);
  for(let step=0; step<5; step++){
    const data = await geminiGenerate(contents);
    const parts = data.candidates?.[0]?.content?.parts || [];
    const calls = parts.filter(p=>p.functionCall).map(p=>p.functionCall);
    if(calls.length){
      contents.push({ role:"model", parts: calls.map(c=>({ functionCall:c })) });
      contents.push({ role:"user",  parts: calls.map(c=>({ functionResponse:{ name:c.name, response: runTool(c.name, c.args) } })) });
      continue;
    }
    const answer = parts.map(p=>p.text).filter(Boolean).join("").trim();
    agentHistory = agentHistory.concat([{role:"user",parts:[{text}]},{role:"model",parts:[{text:answer}]}]).slice(-8);
    return { text: answer };
  }
  return { text: "Thoda aur clear poochhein" };
}

/* --- Provider B: OpenRouter → Gemini model (OpenAI format) --- */
async function orGenerate(messages, model){
  const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),15000);
  const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{
    method:"POST",
    headers:{ "Authorization":"Bearer "+OPENROUTER_API_KEY, "Content-Type":"application/json",
              "HTTP-Referer":"https://billhero.app", "X-Title":"BillHero" },
    body:JSON.stringify({ model: model || OPENROUTER_MODEL, messages, tools:AGENT_TOOLS_OPENAI, temperature:0.1 }),
    signal:ctrl.signal
  });
  clearTimeout(timer);
  if(!res.ok) throw new Error("openrouter "+res.status);
  return res.json();
}
// primary chat model with automatic Gemini fallback
async function orChat(messages){
  const primary = CFG.CHAT_MODEL || OPENROUTER_MODEL;
  try{ return await orGenerate(messages, primary); }
  catch(e){
    if(primary !== OPENROUTER_MODEL){
      console.warn("[ai] chat primary (DeepSeek) failed → MiMo fallback:", e.message);
      return await orGenerate(messages, OPENROUTER_MODEL);
    }
    throw e;
  }
}
// some models return content as an array of parts, or empty (reasoning models) — normalise it
function contentToText(c){
  if(typeof c === "string") return c;
  if(Array.isArray(c)) return c.map(p => typeof p === "string" ? p : (p && (p.text || "")) ).join("");
  return "";
}
function runToolCalls(messages, msg){
  messages.push(msg);
  for(const tc of msg.tool_calls){
    let args = {}; try{ args = JSON.parse(tc.function.arguments || "{}"); }catch(e){}
    console.info("[ai] tool:", tc.function.name, tc.function.arguments);
    messages.push({ role:"tool", tool_call_id: tc.id, content: JSON.stringify(runTool(tc.function.name, args)) });
  }
}
async function askAgentOpenRouter(text){
  // never send empty turns (they can 400 the API / poison the session)
  const cleanHist = agentHistory.filter(m => (m.content && String(m.content).trim()) || (m.tool_calls && m.tool_calls.length));
  const messages = [{ role:"system", content:agentSystem() }, ...cleanHist, { role:"user", content:text }];
  for(let step=0; step<5; step++){
    let data = await orChat(messages);
    let msg = data.choices?.[0]?.message || {};
    if(msg.tool_calls && msg.tool_calls.length){ runToolCalls(messages, msg); continue; }
    let answer = contentToText(msg.content).trim();
    if(!answer){
      // reasoning models sometimes return empty content → retry this step on the fallback model
      console.warn("[ai] empty answer from primary → retrying on fallback model");
      try{
        data = await orGenerate(messages, OPENROUTER_MODEL);
        msg = data.choices?.[0]?.message || {};
        if(msg.tool_calls && msg.tool_calls.length){ runToolCalls(messages, msg); continue; }
        answer = contentToText(msg.content).trim();
      }catch(e){ console.warn("[ai] fallback also failed:", e.message); }
    }
    if(!answer) answer = "Mujhe iska theek jawab nahi mil paya — thoda alag tarah se poochhein.";
    agentHistory = agentHistory.concat([{role:"user",content:text},{role:"assistant",content:answer}]).slice(-8);
    return { text: answer };
  }
  return { text: "Thoda aur clear poochhein" };
}

/* ---------- 8. MAIN DISPATCH ----------
   Smart routing: a recognised command runs on the deterministic engine
   (renders the rich card, uses REAL data — never hallucinates). Anything
   open-ended goes to the dynamic AI agent. This keeps the agent's
   "ask anything" power while guaranteeing correctness for core commands. */
async function handle(text){
  bubble(esc(text), "me");   // user text is DATA — never let typed/pasted HTML execute
  // a live list card on screen? a qty correction ("maggi 5 kar do") acts on IT, not on a new intent
  try{ if(tryOcrCorrection(text)) return; }catch(e){ console.warn("[ocr-fix]", e); }
  // a typed/pasted shopping list → same card flow as a photo (stock check + Create Bill)
  try{
    const list = parseTextList(text);
    if(list){ renderOcr(list); return; }
  }catch(e){ console.warn("[text-list]", e); }
  const intent = detectIntent(text);

  if(intent !== "unknown"){
    try{ runIntent(intent, text); }   // deterministic → real cards, real numbers
    catch(e){
      console.error("[intent]", intent, "crashed:", e);
      bubble("Oops — is command me dikkat aa gayi. Dobara try karein ya thoda alag likhein.");
    }
    return;
  }

  // Open-ended / unrecognised → AI agent (dynamic, any language, reasoning)
  if(AI_ENABLED){
    const t = typing();
    try{
      const ans = await askAgent(text);
      t.remove();
      bubble(ans.text || "Hmm — iska jawab nahi ban paya, dobara poochhiye.");   // never go silent
      setAI(true);
      return;
    }catch(e){ t.remove(); console.warn("agent fell back:", e.message); setAI(false, true); }
  }
  bubble("Maaf kijiye, samajh nahi aaya. Aap keh sakte hain:<br>• <b>2 Parle-G bika</b><br>• <b>aaj kitna becha?</b><br>• <b>kya khatam ho raha hai?</b>");
}
/* ---------- Supplier orders (purchase orders) ---------- */
function orderText(o){
  const store = (CURRENT && CURRENT.shopName) || CFG.STORE_NAME || "BillHero";
  return `*${store}* — Supplier Order\n${new Date(o.ts).toLocaleDateString("en-IN")}\n\n` +
         o.items.map(i=>`• ${i.name} × ${i.qty}`).join("\n") +
         `\n\nKripya jald bhej dein. Dhanyavaad!`;
}
function renderOrder(order){
  const rows = order.items.map(i=>`<div class="li"><span>${esc(i.name)}</span><b>×${i.qty}</b></div>`).join("");
  const el = document.createElement("div"); el.className = "listcard";
  el.innerHTML = `<h4>${svg('cart')} Supplier Order — ${order.status === "pending" ? "pending" : "received"}</h4>${rows}
    <div class="ocr-foot" style="display:flex;gap:8px">
      <button class="btn-share ord-wa" style="flex:1;border:none;border-radius:9px;padding:10px;font-weight:600;cursor:pointer">${svg('share')} Supplier ko bhejein</button>
      ${order.status === "pending" ? `<button class="btn-makebill ord-recv" style="flex:1">${svg('check')} Maal aa gaya</button>` : ""}
    </div>`;
  chat.appendChild(el); scroll();
  el.querySelector(".ord-wa").onclick = () => sendWhatsApp(orderText(order), null);
  const rb = el.querySelector(".ord-recv");
  if(rb) rb.onclick = () => {
    const o = Store.receiveOrder(order.id);
    if(o){
      rb.remove();
      el.querySelector("h4").innerHTML = `${svg('cart')} Supplier Order — received`;
      bubble(`Maal stock me add ho gaya: ${o.items.map(i=>`${esc(i.name)} +${i.qty}`).join(", ")}.`);
    }
  };
}
function doOrderCreate(text){
  const its = extractItems(text).map(x=>({ name:x.item.name, qty:x.qty }));
  if(!its.length){ bubble("Kaunsa saamaan order karna hai? Jaise: <b>2 Lays aur 2 Parle-G ka order laga do</b>"); return; }
  const order = Store.createOrder(its);
  bubble("Supplier order ban gaya. Niche se supplier ko WhatsApp karein — maal aane par <b>Maal aa gaya</b> dabayein, stock khud update ho jayega.");
  renderOrder(order);
}
function doOrdersView(){
  const pending = DB.orders.filter(o=>o.status==="pending");
  if(!pending.length){ bubble("Koi pending supplier order nahi hai. Naya order: <b>2 Lays ka order laga do</b>"); return; }
  bubble(`${pending.length} pending supplier order${pending.length>1?"s":""}:`);
  pending.forEach(renderOrder);
}

// precise per-product answer: stock + price straight from inventory
function doItemInfo(text){
  const its = extractItems(text).map(x => x.item).filter(Boolean);
  if(!its.length){ doInventory(); return; }
  const lines = its.map(i =>
    `<b>${esc(i.name)}</b> — stock: <b>${i.stock} ${i.unit}</b> · price: ₹${i.price}${i.stock<=i.low ? ' · <span style="color:var(--danger)">low, reorder karein</span>' : ''}`
  ).join("<br>");
  bubble(lines);
}

function runIntent(intent, text){
  const items = extractItems(text).map(x=>({item:x.item, qty:x.qty}));
  switch(intent){
    case "bill_view":   doBillView(text); break;
    case "bill_dl":     doBillAction("dl"); break;
    case "bill_wa":     doBillAction("wa"); break;
    case "item_info":   doItemInfo(text); break;
    case "order_create":doOrderCreate(text); break;
    case "orders_view": doOrdersView(); break;
    case "sale":        doSale(items, null, /\b(order|chahiye|chahie|mangwa|mangva|mangwao|bhijwa|laga ?do|lagado|de do|dedo|dena|bana ?do|banado|banao|billing|quick bill)\b/.test(text.toLowerCase()) || /ऑर्डर|प्लेस|चाहिए|दे दो|बना दो|लगा दो/.test(text)); break;
    case "add_stock":   doAddStock(items); break;
    case "query_sales": doQuerySales(); break;
    case "low_stock":   doLowStock(); break;
    case "report":      doReport(); break;
    case "inventory":   doInventory(); break;
    case "undo":        undoSale(null); break;
    case "customers":   doCustomers(); break;
  }
}

/* ---------- 9. STATS + STATUS ---------- */
function refreshStats(){
  const t = STATE.rollups[dateKey(Date.now())] || { total:0, bills:0 };
  $("#statSales").textContent = rupee(t.total);
  $("#statBills").textContent = t.bills;
  $("#statLow").textContent = STATE.inv.filter(i=>i.stock<=i.low).length;
}
function setAI(on, degraded){
  $("#aiDot").classList.toggle("on", !!on);
  $("#aiLabel").textContent = on ? "AI ON" : (degraded ? "Offline (AI busy)" : "Offline mode");
}

/* ---------- 10. VOICE (press & hold → record → Gemini transcribes) ----------
   Independent of Chrome's Web Speech service: we record the audio ourselves
   (MediaRecorder), convert it to WAV, and the AI model transcribes it. Works in
   any browser that can record. Transcript lands in the input box; user taps Send. */
function initVoice(){
  const micBtn = $("#micBtn");
  const tip = document.getElementById("voiceTip");
  const setTip = (msg, hot) => { if(tip){ tip.lastChild.textContent = " " + msg; tip.classList.toggle("hot", !!hot); } };
  const TIP_DEFAULT = "Press & hold the mic to speak";
  if(!navigator.mediaDevices || !window.MediaRecorder){
    micBtn.title = "Recording not supported in this browser"; micBtn.style.opacity = ".4"; setTip("Voice needs a modern browser"); return;
  }
  micBtn.title = "Press & hold to speak";

  let holding=false, processed=true, pressT=0, stream=null, recorder=null, chunks=[];
  let meterCtx=null, meterTimer=null, maxLevel=0;

  function startMeter(s){
    try{
      meterCtx = new (window.AudioContext || window.webkitAudioContext)();
      meterCtx.resume();
      const an = meterCtx.createAnalyser();
      meterCtx.createMediaStreamSource(s).connect(an);
      const d = new Uint8Array(an.fftSize); maxLevel = 0;
      meterTimer = setInterval(() => {
        an.getByteTimeDomainData(d);
        let mn=255, mx=0; for(let i=0;i<d.length;i++){ if(d[i]<mn)mn=d[i]; if(d[i]>mx)mx=d[i]; }
        if(mx-mn > maxLevel) maxLevel = mx-mn;
      }, 300);
    }catch(e){}
  }
  function cleanupAudio(){
    if(meterTimer){ clearInterval(meterTimer); meterTimer=null; }
    if(meterCtx){ meterCtx.close().catch(()=>{}); meterCtx=null; }
    if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  }

  const startHold = async (e) => {
    if(e){
      e.preventDefault();
      if(e.pointerId != null && micBtn.setPointerCapture){ try{ micBtn.setPointerCapture(e.pointerId); }catch(_){} }
    }
    if(holding) return;
    holding = true; processed = false; chunks = []; pressT = Date.now();
    setTip("Mic shuru ho raha hai…", true);
    try{
      stream = await navigator.mediaDevices.getUserMedia({ audio:{ noiseSuppression:true, echoCancellation:true, autoGainControl:true, channelCount:1 } });
    }catch(err){
      holding = false; processed = true; setTip(TIP_DEFAULT);
      console.warn("[voice] mic denied:", err.name);
      bubble("Mic permission chahiye — browser me 'Allow' karein, phir dobara hold karein.");
      return;
    }
    if(!holding){ cleanupAudio(); processed = true; setTip(TIP_DEFAULT); return; }  // released during permission prompt
    startMeter(stream);
    try{ recorder = new MediaRecorder(stream); }
    catch(err){ cleanupAudio(); holding=false; processed=true; setTip(TIP_DEFAULT); return; }
    recorder.ondataavailable = ev => { if(ev.data && ev.data.size) chunks.push(ev.data); };
    recorder.onstop = onRecorded;
    recorder.start();
    micBtn.classList.add("rec");
    setTip("Recording… release to finish", true);
    $("#input").placeholder = "Suniye… (bolkar chhodein)";
    console.info("[voice] recording started");
  };

  const endHold = () => {
    if(!holding) return;
    holding = false;
    micBtn.classList.remove("rec");
    if(recorder && recorder.state !== "inactive"){
      setTip("Transcribe ho raha hai…", true);
      try{ recorder.stop(); }catch(_){ onRecorded(); }     // recorder.onstop → onRecorded
    } else {
      cleanupAudio(); processed = true; setTip(TIP_DEFAULT);
      if(Date.now()-pressT < 350) showToast("Mic ko dabaye rakhein — press & hold karke boliye");
    }
  };

  async function onRecorded(){
    cleanupAudio();
    if(processed) return; processed = true;
    $("#input").placeholder = CUR.ph;
    const blob = new Blob(chunks, { type: (recorder && recorder.mimeType) || "audio/webm" });
    console.info("[voice] recorded", blob.size, "bytes | peak level =", maxLevel);
    if(blob.size < 1500 || Date.now()-pressT < 350){
      setTip(TIP_DEFAULT);
      showToast("Mic ko dabaye rakhein — press & hold karke boliye");
      return;
    }
    if(maxLevel < 6){
      setTip(TIP_DEFAULT);
      bubble(`Mic se awaaz nahi aa rahi (level ${maxLevel}/255) — Chrome settings me sahi microphone device chunein.`);
      return;
    }
    try{
      const wav = await blobToWav16k(blob);
      const text = await aiTranscribe(wav);
      setTip(TIP_DEFAULT);
      console.info("[voice] transcript:", JSON.stringify(text));
      if(text){ $("#input").value = text; $("#input").focus(); }
      else showToast("Samajh nahi aaya — dobara boliye");
    }catch(err){
      console.warn("[voice] transcription failed:", err.message);
      setTip(TIP_DEFAULT);
      bubble("Voice transcribe nahi ho paya — network/AI check karke dobara try karein.");
    }
  }

  micBtn.addEventListener("pointerdown", startHold);
  micBtn.addEventListener("pointerup", endHold);
  micBtn.addEventListener("pointercancel", endHold);
  window.addEventListener("pointerup", endHold);
  micBtn.addEventListener("contextmenu", e => e.preventDefault());
}

// decode the recorded blob → mono 16 kHz 16-bit WAV → base64 (universally accepted)
async function blobToWav16k(blob){
  const buf = await blob.arrayBuffer();
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = await ac.decodeAudioData(buf);
  ac.close().catch(()=>{});
  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration*rate)), rate);
  const src = off.createBufferSource(); src.buffer = decoded; src.connect(off.destination); src.start();
  const rendered = await off.startRendering();
  const pcm = rendered.getChannelData(0);
  const n = pcm.length;
  const out = new DataView(new ArrayBuffer(44 + n*2));
  const wstr = (o,s)=>{ for(let i=0;i<s.length;i++) out.setUint8(o+i, s.charCodeAt(i)); };
  wstr(0,"RIFF"); out.setUint32(4, 36 + n*2, true); wstr(8,"WAVE"); wstr(12,"fmt ");
  out.setUint32(16,16,true); out.setUint16(20,1,true); out.setUint16(22,1,true);
  out.setUint32(24,rate,true); out.setUint32(28,rate*2,true); out.setUint16(32,2,true); out.setUint16(34,16,true);
  wstr(36,"data"); out.setUint32(40, n*2, true);
  for(let i=0;i<n;i++){ const s = Math.max(-1, Math.min(1, pcm[i])); out.setInt16(44+i*2, s<0 ? s*0x8000 : s*0x7FFF, true); }
  const bytes = new Uint8Array(out.buffer);
  let bin = ""; const CH = 0x8000;
  for(let i=0;i<bytes.length;i+=CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i+CH));
  return btoa(bin);
}

// transcribe base64 WAV via the configured AI provider (a Gemini model)
async function aiTranscribe(b64){
  // vocabulary priming: knowing the shop's product names + typical commands
  // dramatically improves recognition of exactly those words
  const vocab = DB.inv.slice(0, 60).map(i => i.name).join(", ");
  const prompt = `You transcribe voice commands for an Indian shop-billing app. The speaker is a shopkeeper, likely speaking ${CUR.gName}; Hindi-English mixing is normal.

VOCABULARY HINTS — this shop's products (when the audio sounds like one of these, use this exact spelling): ${vocab}.
Typical commands sound like: "2 Parle-G, 1 Maggi bika" · "stock dikhao" · "aaj kitna becha" · "kya khatam ho raha hai" · "10 Maggi aaya" · "is hafte ka hisab" · "customer list".

Return the CLEANED transcript of what they intend to say:
- remove fillers, stutters, repeated words and false starts (e.g. "nahi", "matlab", "umm", restarted phrases)
- when a number word denotes a QUANTITY, write it as a digit (e.g. "do packet" → "2 packet", "eight bill" → "8 bill") — but do NOT change verbs like "de do"
- keep the speaker's own language/wording otherwise; prefer the vocabulary spellings above for product names
- if they corrected themselves, keep only the corrected version
Reply with ONLY the final clean sentence — no quotes, no explanation.`;
  const ctrl = new AbortController(); const timer = setTimeout(()=>ctrl.abort(), 25000);
  async function orAudio(model){
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", { method:"POST",
      headers:{ "Authorization":"Bearer "+OPENROUTER_API_KEY, "Content-Type":"application/json", "HTTP-Referer":"https://billhero.app", "X-Title":"BillHero" },
      body: JSON.stringify({ model, temperature: 0,
        messages:[{ role:"user", content:[ { type:"text", text: prompt }, { type:"input_audio", input_audio:{ data: b64, format: "wav" } } ] }] }),
      signal: ctrl.signal });
    if(!res.ok) throw new Error("transcribe " + res.status);
    const d = await res.json();
    return (d.choices?.[0]?.message?.content || "").trim();
  }
  try{
    if(AI_PROVIDER === "openrouter"){
      const TPRIMARY  = CFG.TRANSCRIBE_MODEL    || "google/gemini-3.8-flash";   // best Hinglish ear
      const TFALLBACK = CFG.TRANSCRIBE_FALLBACK || "google/gemini-2.5-flash";
      try{
        const t = await orAudio(TPRIMARY);
        if(t) return t;
        throw new Error("empty transcript");
      }catch(e){
        if(TPRIMARY === TFALLBACK) throw e;
        console.warn("[voice] primary transcriber failed → fallback:", e.message);
        return await orAudio(TFALLBACK);
      }
    } else {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ contents:[{ role:"user", parts:[ { text: prompt }, { inlineData:{ mimeType:"audio/wav", data: b64 } } ] }], generationConfig:{ temperature: 0 } }),
        signal: ctrl.signal });
      if(!res.ok) throw new Error("transcribe " + res.status);
      const d = await res.json();
      return (d.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
    }
  } finally { clearTimeout(timer); }
}

/* ---------- 10b. LANGUAGE PICKER + AUTO-DETECT ---------- */
const langIndexById = id => Math.max(0, LANGS.findIndex(l=>l.id===id));

function buildLangPicker(){
  const sel = $("#langSel");
  sel.innerHTML = LANGS.map((l,i)=>`<option value="${i}">${l.label}</option>`).join("");
  sel.onchange = () => chooseLang(parseInt(sel.value));
}
// apply a language to the UI (no persistence)
function applyLang(i, announce){
  i = (i>=0 && i<LANGS.length) ? i : 0;
  CUR = LANGS[i];
  if(REC) REC.lang = CUR.code;
  const sel = $("#langSel"); if(sel) sel.value = String(i);
  $("#input").placeholder = CUR.ph;
  if(announce){
    bubble(CUR.greet, "bot");
    if(!AI_ENABLED && CUR.id!=="hinglish" && CUR.id!=="english")
      bubble(" Tip: full <b>"+CUR.label+"</b> understanding needs Gemini AI on. Offline mode works best in Hinglish / English.");
  }
}
// user explicitly picked a language → remember it
function chooseLang(i){ applyLang(i, true); localStorage.setItem("bh_lang", LANGS[i].id); }

// Tier 1: guess from the phone's own locale (instant, no permission, free)
function detectFromLocale(){
  const map = { hi:"hindi", bn:"bengali", ta:"tamil", te:"telugu", mr:"marathi", gu:"gujarati", kn:"kannada" };
  for(const l of (navigator.languages || [navigator.language || "en"])){
    const [code, region] = (l||"").toLowerCase().split("-");
    if(map[code]) return map[code];
    if(code === "en") return region === "in" ? "hinglish" : "english"; // English = universal fallback
  }
  return "english";
}

// Tier 2: optional GPS → Indian state → language (keyless, free reverse-geocode)
const STATE_LANG = {
  "west bengal":"bengali","tripura":"bengali",
  "tamil nadu":"tamil","puducherry":"tamil",
  "telangana":"telugu","andhra pradesh":"telugu",
  "maharashtra":"marathi","goa":"marathi",
  "gujarat":"gujarati","dadra":"gujarati","daman":"gujarati",
  "karnataka":"kannada",
  "jharkhand":"hindi","bihar":"hindi","uttar pradesh":"hindi","madhya pradesh":"hindi",
  "rajasthan":"hindi","delhi":"hindi","haryana":"hindi","uttarakhand":"hindi",
  "himachal pradesh":"hindi","chhattisgarh":"hindi",
};
function stateToLang(state, country){
  if(country && country !== "IN") return "english";   // universal fallback outside India
  for(const k in STATE_LANG){ if(state.includes(k)) return STATE_LANG[k]; }
  return "hinglish";                                   // India but unmapped region
}
function detectByLocation(){
  const btn = $("#locBtn");
  if(!navigator.geolocation){ if(btn) btn.textContent="Location not available"; return; }
  if(btn){ btn.textContent=" Detecting…"; btn.disabled=true; }
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      const { latitude, longitude } = pos.coords;
      const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
      const d = await r.json();
      const state = (d.principalSubdivision||"").toLowerCase();
      const id = stateToLang(state, d.countryCode||"");
      chooseLang(langIndexById(id));
    }catch(e){ chooseLang(langIndexById("english")); }
    closeWelcome();
  }, ()=>{
    if(btn){ btn.textContent=" Detect by my location"; btn.disabled=false; }
    bubble(" Location declined — pick your language above.");
  }, { timeout:8000, maximumAge:600000 });
}

/* ---------- 10c. FIRST-RUN WELCOME ---------- */
function showWelcome(preIdx){
  const grid = LANGS.map((l,i)=>`<button class="lang-opt ${i===preIdx?'pre':''}" data-i="${i}">${l.label}</button>`).join("");
  const bd = document.createElement("div");
  bd.className = "sheet-backdrop"; bd.id = "welcome";
  bd.innerHTML = `
    <div class="sheet">
      <div class="sheet-logo">${svg('location',22)}</div>
      <h3>Welcome to BillHero</h3>
      <p>Choose your language — we guessed <b>${LANGS[preIdx].label}</b></p>
      <div class="lang-grid">${grid}</div>
      <button class="loc-btn" id="locBtn">${svg('location')} Detect by my location</button>
      <small>You can change it anytime from the top-right.</small>
    </div>`;
  document.body.appendChild(bd);
  bd.querySelectorAll(".lang-opt").forEach(b => b.onclick = () => { chooseLang(parseInt(b.dataset.i)); closeWelcome(); });
  $("#locBtn").onclick = detectByLocation;
}
function closeWelcome(){ const w = $("#welcome"); if(w) w.remove(); }

/* ---------- 12. AUTH + ONBOARDING ---------- */
const USE_FIREBASE = !!(CFG.FIREBASE_CONFIG && CFG.FIREBASE_CONFIG.apiKey);

// Local auth fallback (used when Firebase is not configured, or if it fails)
function localAccounts(){ return load("bh_accounts", {}); }
function hash(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0; } return String(h); }
const LocalAuth = {
  async signUp(p){
    const accts = localAccounts();
    const email = (p.email||"").toLowerCase().trim();
    if(!email || !p.password || p.password.length<6) throw new Error("Email aur kam se kam 6 character ka password daalein.");
    if(accts[email]) throw new Error("Ye email pehle se registered hai — Login karein.");
    const uid = "u"+Date.now();
    accts[email] = { uid, pass:hash(p.password), shopName:p.shopName||"My Shop", ownerName:p.ownerName||"", city:p.city||"", email };
    try{ localStorage.setItem("bh_accounts", JSON.stringify(accts)); localStorage.setItem("bh_session", email); }catch(e){}
    loadShopData(uid, true);
    return { uid, shopName:accts[email].shopName, ownerName:accts[email].ownerName, city:accts[email].city, email, isNew:true };
  },
  async signIn(email, password){
    const accts = localAccounts(); email=(email||"").toLowerCase().trim();
    const a = accts[email];
    if(!a || a.pass!==hash(password||"")) throw new Error("Email ya password galat hai.");
    try{ localStorage.setItem("bh_session", email); }catch(e){}
    loadShopData(a.uid, false);
    return { uid:a.uid, shopName:a.shopName, ownerName:a.ownerName, city:a.city, email, isNew:false };
  },
  async signOut(){ try{ localStorage.removeItem("bh_session"); }catch(e){} },
  current(){ const email=load("bh_session",null); if(!email) return null; const a=localAccounts()[email]; if(!a) return null; loadShopData(a.uid,false); return { uid:a.uid, shopName:a.shopName, ownerName:a.ownerName, city:a.city, email }; }
};
window.__LocalAuth = LocalAuth;
window.BillHeroAuth = LocalAuth;                 // db.js overrides with Firebase when configured
window.__bootLocal = () => { window.BillHeroAuth = LocalAuth; const shop = LocalAuth.current(); shop ? enterShop(shop) : showAuth(); };

// Called by local flow or by db.js when auth state is known
window.onShopAuth = (shop) => {
  if(!shop) return showAuth();
  if(shop.isNew) startOnboarding(shop);   // new shop → add products first
  else enterShop(shop);
};

function showAuth(){
  CURRENT = null;
  document.getElementById("app").classList.add("hide");
  document.getElementById("auth").classList.remove("hide");
}
function enterShop(shop){
  CURRENT = shop;
  document.getElementById("auth").classList.add("hide");
  document.getElementById("app").classList.remove("hide");
  $("#storeName").textContent = shop.shopName || "My Shop";
  setAI(AI_ENABLED);
  if(window.BillHeroCloud && window.BillHeroCloud.ready) window.__cloudStatus(true);
  agentHistory = [];
  refreshStats();
  restoreChat();   // bring back previous conversation; greeting only if first time
}

/* ---------- Chat sessions (multiple retrievable chats per shop; real-time via Firestore) ---------- */
let activeChatId = null;
let chatList = [];          // [{id, title, updatedAt, html}]
let _chatTimer = null;
let chatUnsub = null;       // live-watch unsubscribe for the active chat
let lastChatHtml = "";      // guards against repainting our own echo

const chatMetaKey = () => "bh_chats_"  + (CURRENT ? CURRENT.uid : "guest");
const chatHtmlKey = id => "bh_chat_"   + (CURRENT ? CURRENT.uid : "guest") + "_" + id;

function queueSaveChat(){ clearTimeout(_chatTimer); _chatTimer = setTimeout(saveChat, 800); }
function cleanChatHTML(){
  const clone = chat.cloneNode(true);
  clone.querySelectorAll(".msg").forEach(m => { if(m.querySelector(".typing")) m.remove(); });
  clone.querySelectorAll('img[src^="data:"]').forEach(im => { im.removeAttribute("src"); im.setAttribute("alt","📷 image"); });
  while(clone.children.length > 60) clone.removeChild(clone.firstChild);
  return clone.innerHTML;
}
function deriveTitle(){
  const me = chat.querySelector(".msg.me");
  let t = me ? me.textContent.replace(/\d{1,2}:\d{2}\s*[ap]?m?$/i,"").trim() : "";
  return (t || "New chat").slice(0, 40);
}
function disableRestoredControls(){
  chat.querySelectorAll(".bill-actions button, .btn-share, .btn-dl, .btn-undo, .btn-makebill, .chip").forEach(b => { b.disabled = true; b.style.opacity = ".55"; b.style.cursor = "default"; });
  chat.querySelectorAll(".li.tap").forEach(r => r.classList.remove("tap"));
}
function saveChat(){
  if(!CURRENT || !activeChatId) return;
  let html; try{ html = cleanChatHTML(); }catch(e){ return; }
  const title = deriveTitle();
  lastChatHtml = html;
  const c = CLOUD();
  if(c && c.saveChat){                              // cloud = source of truth, no localStorage
    if(html.length < 900000) c.saveChat(activeChatId, title, html, SESSION_ID);
  } else {                                          // local fallback (only when Firebase is absent)
    try{
      localStorage.setItem(chatHtmlKey(activeChatId), html);
      const meta = (load(chatMetaKey(), []) || []).filter(m => m.id !== activeChatId);
      meta.unshift({ id: activeChatId, title, updatedAt: Date.now() });
      localStorage.setItem(chatMetaKey(), JSON.stringify(meta.slice(0, 50)));
    }catch(e){}
  }
}
async function refreshChatList(){
  const c = CLOUD();
  if(c && c.listChats){
    try{ chatList = await c.listChats(); return; }catch(e){ /* fall through */ }
  }
  chatList = (load(chatMetaKey(), []) || []).map(m => ({ ...m, html: localStorage.getItem(chatHtmlKey(m.id)) || "" }));
}
// defense-in-depth: restored chat HTML must never carry executable bits
// (kills pre-r41 stored payloads and backstops any future escaping miss)
function sanitizeChatDOM(root){
  root.querySelectorAll("script, iframe, object, embed").forEach(n => n.remove());
  root.querySelectorAll("*").forEach(n => {
    for(const a of [...n.attributes]){
      if(/^on/i.test(a.name)) n.removeAttribute(a.name);
      else if(/^(href|src|xlink:href)$/i.test(a.name) && /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name);
    }
  });
}
function paintChat(html){
  chat.innerHTML = html || "";
  sanitizeChatDOM(chat);
  chat.querySelectorAll(".msg").forEach(m => { if(m.querySelector(".typing")) m.remove(); });
  disableRestoredControls();
  if(!chat.children.length) bubble(CUR.greet);
  scroll();
}
function watchActiveChat(){
  if(chatUnsub){ chatUnsub(); chatUnsub = null; }
  const c = CLOUD();
  if(c && c.watchChat && activeChatId){
    chatUnsub = c.watchChat(activeChatId, (html, dev) => {
      if(dev === SESSION_ID){ lastChatHtml = html; return; }   // our own write's echo → NEVER repaint (was reverting the screen)
      if(html === lastChatHtml) return;
      lastChatHtml = html;
      // NEVER repaint over live interactive work: a pending bill/order card or the
      // typing indicator means the user is mid-action — repainting would kill the
      // card's buttons ("stuck" Confirm). The next remote save syncs us later.
      if(chat.querySelector(".bill:not(.done):not(.saved), .btn-makebill:not([disabled]), .chip:not([disabled])") || document.getElementById("typing")) return;
      paintChat(html);                                          // genuine update from another device
    });
  }
}
async function restoreChat(){
  chat.innerHTML = "";
  await refreshChatList();
  const entry = chatList[0];               // most recent chat
  if(entry){
    activeChatId = entry.id; lastChatHtml = entry.html || "";
    paintChat(entry.html);
  } else {
    activeChatId = "c" + Date.now();
    if(!localStorage.getItem("bh_lang")) showWelcome(langIndexById(CUR.id));
    else bubble(CUR.greet);
  }
  watchActiveChat();
}
function newChat(){
  activeChatId = "c" + Date.now(); lastChatHtml = "";
  agentHistory = [];
  chat.innerHTML = "";
  bubble(CUR.greet);
  saveChat();
  watchActiveChat();
}
async function openChat(id){
  await refreshChatList();
  const entry = chatList.find(x => x.id === id);
  if(!entry) return;
  activeChatId = id; lastChatHtml = entry.html || "";
  agentHistory = [];
  paintChat(entry.html);
  watchActiveChat();
}
async function deleteChat(id){
  const c = CLOUD();
  if(c && c.deleteChat){ c.deleteChat(id); }
  else{
    try{ localStorage.removeItem(chatHtmlKey(id)); const meta=(load(chatMetaKey(),[])||[]).filter(m=>m.id!==id); localStorage.setItem(chatMetaKey(), JSON.stringify(meta)); }catch(e){}
  }
  if(id === activeChatId){ await restoreChat(); }
}
async function openChatsDrawer(){
  await refreshChatList();
  const rows = chatList.length ? chatList.map(c => `
    <div class="chat-row ${c.id===activeChatId?'active':''}" data-id="${c.id}">
      <button class="chat-open" data-id="${c.id}"><span>${esc(c.title||'Chat')}</span><small>${new Date(c.updatedAt||Date.now()).toLocaleDateString('en-IN')}</small></button>
      <button class="chat-del" data-id="${c.id}" title="Delete">✕</button>
    </div>`).join("") : `<p class="onb-hint">Abhi koi chat nahi.</p>`;
  const bd = document.createElement("div"); bd.className = "sheet-backdrop"; bd.id = "chatsheet";
  bd.innerHTML = `
    <div class="sheet">
      <div class="sheet-logo">${svg('list',22)}</div>
      <h3>Your chats</h3>
      <button class="loc-btn" id="newChatBtn">${svg('plus')} New chat</button>
      <div class="chat-list">${rows}</div>
    </div>`;
  document.body.appendChild(bd);
  bd.addEventListener("click", e => { if(e.target === bd) bd.remove(); });
  $("#newChatBtn").onclick = () => { bd.remove(); newChat(); };
  bd.querySelectorAll(".chat-open").forEach(b => b.onclick = () => { bd.remove(); openChat(b.dataset.id); });
  bd.querySelectorAll(".chat-del").forEach(b => b.onclick = async (ev) => { ev.stopPropagation(); await deleteChat(b.dataset.id); bd.remove(); openChatsDrawer(); });
}
async function doLogout(){
  try{ if(window.BillHeroAuth) await window.BillHeroAuth.signOut(); }catch(e){}
  if(chatUnsub){ chatUnsub(); chatUnsub = null; }
  STATE.inv = []; STATE.sales = []; STATE.customers = []; STATE.orders = []; STATE.rollups = {};
  activeChatId = null; lastChatHtml = "";
  showAuth();
}
function authErr(msg){ const el=document.getElementById("authErr"); if(el) el.textContent = msg||""; }
function wireAuthScreen(){
  const show = which => {
    document.getElementById("tabLogin").classList.toggle("active", which==="login");
    document.getElementById("tabSignup").classList.toggle("active", which==="signup");
    document.getElementById("loginForm").classList.toggle("hide", which!=="login");
    document.getElementById("signupForm").classList.toggle("hide", which!=="signup");
    authErr("");
  };
  document.getElementById("tabLogin").onclick  = () => show("login");
  document.getElementById("tabSignup").onclick = () => show("signup");

  document.getElementById("loginForm").onsubmit = async e => {
    e.preventDefault(); authErr("");
    const btn = e.target.querySelector("button"); btn.disabled = true;
    try{
      const shop = await window.BillHeroAuth.signIn($("#liEmail").value, $("#liPass").value);
      if(!USE_FIREBASE) window.onShopAuth(shop);   // Firebase drives this via onAuthStateChanged
    }catch(err){ authErr(err.message || "Login failed"); }
    finally{ btn.disabled = false; }
  };
  document.getElementById("signupForm").onsubmit = async e => {
    e.preventDefault(); authErr("");
    const btn = e.target.querySelector("button"); btn.disabled = true;
    try{
      const shop = await window.BillHeroAuth.signUp({
        shopName:$("#suShop").value.trim(), ownerName:$("#suOwner").value.trim(),
        city:$("#suCity").value.trim(), email:$("#suEmail").value, password:$("#suPass").value
      });
      if(!USE_FIREBASE) window.onShopAuth(shop);
    }catch(err){ authErr(err.message || "Could not create shop"); }
    finally{ btn.disabled = false; }
  };
}

/* ---------- 12b. ONBOARDING: ADD / IMPORT PRODUCTS ---------- */
let onbExpect = null;

function startOnboarding(shop){
  CURRENT = shop;
  document.getElementById("auth").classList.add("hide");
  document.getElementById("app").classList.add("hide");
  document.getElementById("onboard").classList.remove("hide");
  document.getElementById("onbSub").textContent =
    `Welcome${shop.ownerName ? ", "+shop.ownerName : ""}! Add ${shop.shopName || "your shop"}'s products — pick the easiest way.`;
  onbShowChoices();
}
function wireOnboarding(){
  document.querySelectorAll("#onbChoices .onb-opt").forEach(b => b.onclick = () => onbAction(b.dataset.act));
  document.getElementById("onbSkip").onclick = () => finalizeImport(structuredClone(SEED_INVENTORY));
  document.getElementById("onbFile").onchange = e => { const f=e.target.files[0]; if(f) onbFile(f); e.target.value=""; };
}
function onbShowChoices(){
  document.getElementById("onbChoices").classList.remove("hide");
  const p=document.getElementById("onbPanel"); p.classList.add("hide"); p.innerHTML="";
}
function onbAction(act){
  if(act==="starter"){ finalizeImport(structuredClone(SEED_INVENTORY)); return; }
  if(act==="paste"){ onbPastePanel(); return; }
  const f = document.getElementById("onbFile");
  if(act==="csv"){   onbExpect="csv";   f.setAttribute("accept",".csv,text/csv"); f.click(); return; }
  if(act==="photo"){ onbExpect="photo"; f.setAttribute("accept","image/*");       f.click(); return; }
}
function onbPanel(){ const p=document.getElementById("onbPanel"); document.getElementById("onbChoices").classList.add("hide"); p.classList.remove("hide"); return p; }
function onbPastePanel(){
  const p=onbPanel();
  p.innerHTML = `<p class="onb-hint">Ek line me ek product: naam, price, quantity. Jaise:<br><code>Parle-G 10 24</code></p>
    <textarea id="onbText" class="onb-textarea" rows="7" placeholder="Parle-G 10 24&#10;Maggi 14 6&#10;Tata Salt 28 10"></textarea>
    <button class="auth-btn" id="onbParse">Preview products</button>
    <button class="ghost-btn" id="onbBack">Back</button>`;
  document.getElementById("onbParse").onclick = () => onbPreview(parseProductLines(document.getElementById("onbText").value), "typed");
  document.getElementById("onbBack").onclick = onbShowChoices;
}
async function onbFile(f){
  if(onbExpect==="csv"){
    try{ const text = await f.text(); const p=onbPanel(); p.innerHTML=`<p class="onb-hint">Reading file…</p>`; onbPreview(await importCSVText(text), "CSV import"); }
    catch(e){ onbInfo("File padhne me dikkat aayi. CSV export try karein."); }
  } else if(onbExpect==="photo"){
    if(!AI_ENABLED){ onbInfo("Photo import ke liye AI key chahiye (config.js). Abhi list paste ya CSV import karein."); return; }
    const p=onbPanel(); p.innerHTML=`<p class="onb-hint">Reading photo…</p>`;
    try{
      const dataUrl = await fileToDataURL(f);
      const prep = await prepImage(dataUrl);
      const items = await aiVision(prep.b64, prep.mime);
      onbPreview(items.map(x=>({name:x.name, price:0, stock:x.qty||0})), "photo");
    }catch(e){ onbInfo("Photo padhne me dikkat aayi. Dobara try karein ya list paste karein."); }
  }
}
function onbInfo(msg){ const p=onbPanel(); p.innerHTML=`<p class="onb-hint">${msg}</p><button class="ghost-btn" id="onbBack">Back</button>`; document.getElementById("onbBack").onclick=onbShowChoices; }
function onbPreview(items, source){
  const clean = (items||[]).filter(i=>i.name && i.name.trim());
  const p=onbPanel();
  if(!clean.length){ onbInfo("Koi product nahi mila. Format check karke dobara try karein."); return; }
  const rows = clean.slice(0,60).map(i=>`<div class="onb-row"><span>${esc(i.name)}</span><b>₹${Number(i.price)||0} · ${Number(i.stock)||0}</b></div>`).join("");
  p.innerHTML = `<p class="onb-hint">${clean.length} products mile${source?` (${source})`:""}. Theek lage to add karein:</p>
    <div class="onb-list">${rows}${clean.length>60?`<div class="onb-row"><span>+${clean.length-60} more</span><b></b></div>`:""}</div>
    <button class="auth-btn" id="onbConfirm">${svg('check')} Add ${clean.length} products &amp; continue</button>
    <button class="ghost-btn" id="onbBack">Back</button>`;
  document.getElementById("onbConfirm").onclick = () => finalizeImport(clean);
  document.getElementById("onbBack").onclick = onbShowChoices;
}
function finalizeImport(products){
  const clean = (products||[]).filter(p=>p.name && String(p.name).trim()).map(p=>({
    name:String(p.name).trim(), price:Number(p.price)||0, stock:Number(p.stock)||0,
    unit:(p.unit||"pc"), low:Number(p.low)||5
  }));
  Store.setInventory(clean.length ? clean : structuredClone(SEED_INVENTORY));
  document.getElementById("onboard").classList.add("hide");
  enterShop(CURRENT);
}

// Smart parsers ----------------------------------------------------
function parseProductLines(text){
  return (text||"").split(/\n+/).map(line=>{
    const raw = line.trim(); if(!raw) return null;
    const nums = raw.replace(/[₹]/g,"").match(/\d+(?:\.\d+)?/g) || [];
    let name = raw;
    const firstNum = raw.search(/\d/);
    if(firstNum>0) name = raw.slice(0,firstNum);
    name = name.replace(/[-–,:xX*₹]+\s*$/,"").replace(/[₹]/g,"").trim();
    if(!name) return null;
    return { name, price: nums[0]!=null?parseFloat(nums[0]):0, stock: nums[1]!=null?parseInt(nums[1]):0, unit:"pc", low:5 };
  }).filter(Boolean);
}
function splitCSVLine(line){
  const out=[]; let cur="", q=false;
  for(let i=0;i<line.length;i++){ const c=line[i];
    if(c==='"'){ if(q && line[i+1]==='"'){ cur+='"'; i++; } else q=!q; }
    else if(c===',' && !q){ out.push(cur); cur=""; }
    else cur+=c;
  }
  out.push(cur); return out.map(s=>s.trim());
}
// Import CSV — heuristic header match first, AI column-mapping if unknown, positional as last resort
async function importCSVText(text){
  const lines = (text||"").split(/\r?\n/).filter(l=>l.trim());
  if(!lines.length) return [];
  const rows = lines.map(splitCSVLine);
  const header = rows[0].map(h=>h.toLowerCase().trim());
  const col = re => header.findIndex(h=>re.test(h));
  let ci = { name:col(/name|item|product|particular/), price:col(/sale.*price|sell|price|rate|mrp/), stock:col(/opening.*stock|stock|qty|quantity/), unit:col(/unit/) };
  let dataRows = rows.slice(1);
  if(ci.name < 0){
    if(AI_ENABLED){
      try{ const m = await smartMapCSV(rows.slice(0,4)); if(m && m.name>=0) ci = m; else { ci={name:0,price:1,stock:2,unit:-1}; dataRows=rows; } }
      catch(e){ console.warn("csv map fell back:", e.message); ci={name:0,price:1,stock:2,unit:-1}; dataRows=rows; }
    } else { ci={name:0,price:1,stock:2,unit:-1}; dataRows=rows; }
  }
  const toNum = s => parseFloat(String(s||"").replace(/[^\d.]/g,"")) || 0;
  return dataRows.map(r=>({
    name:(r[ci.name]||"").trim(),
    price: ci.price>=0 ? toNum(r[ci.price]) : 0,
    stock: ci.stock>=0 ? Math.round(toNum(r[ci.stock])) : 0,
    unit:  ci.unit>=0 ? (r[ci.unit]||"pc").trim() : "pc",
    low:5
  })).filter(p=>p.name);
}
// Ask the AI which column is which (for unrecognised export formats)
async function smartMapCSV(sampleRows){
  const prompt = `These are the first rows of a product CSV from a shop billing app. Columns are 0-indexed. Return ONLY JSON {"name":N,"price":N,"stock":N,"unit":N} giving the 0-based column index for the product NAME, selling PRICE, STOCK quantity, and UNIT (-1 if a field is missing).\n${sampleRows.map((r,i)=>i+": "+r.join(" | ")).join("\n")}`;
  let raw = "{}";
  if(AI_PROVIDER==="openrouter"){
    const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",
      headers:{ "Authorization":"Bearer "+OPENROUTER_API_KEY, "Content-Type":"application/json", "HTTP-Referer":"https://billhero.app", "X-Title":"BillHero" },
      body:JSON.stringify({ model:OPENROUTER_MODEL, messages:[{role:"user",content:prompt}], temperature:0 }) });
    if(!res.ok) throw new Error("map "+res.status);
    raw = (await res.json()).choices?.[0]?.message?.content || "{}";
  } else {
    const schema={ type:"object", properties:{ name:{type:"number"}, price:{type:"number"}, stock:{type:"number"}, unit:{type:"number"} }, required:["name","price","stock","unit"] };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ contents:[{role:"user",parts:[{text:prompt}]}], generationConfig:{ responseMimeType:"application/json", temperature:0 } })});
    if(!res.ok) throw new Error("map "+res.status);
    raw = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  }
  const m = extractJSON(raw);
  return { name:m.name??-1, price:m.price??-1, stock:m.stock??-1, unit:m.unit??-1 };
}

/* ---------- 12d. INLINE EDIT / DELETE PRODUCT ---------- */
function openEditProduct(name, rowEl){
  const item = DB.inv.find(i=>i.name===name); if(!item) return;
  const bd=document.createElement("div"); bd.className="sheet-backdrop"; bd.id="editsheet";
  bd.innerHTML=`
    <div class="sheet">
      <div class="sheet-logo">${svg('package',22)}</div>
      <h3>Edit product</h3>
      <p>Price aur stock update karein, ya product hatayein</p>
      <input id="epName" class="cust-in" value="${esc(item.name)}" placeholder="Product name" />
      <div style="display:flex;gap:8px">
        <input id="epPrice" class="cust-in" type="number" inputmode="decimal" value="${item.price}" placeholder="Price ₹" />
        <input id="epStock" class="cust-in" type="number" inputmode="numeric" value="${item.stock}" placeholder="Stock" />
      </div>
      <button class="loc-btn" id="epSave">${svg('check')} Save changes</button>
      <button class="ghost-btn danger" id="epDelete">Delete product</button>
    </div>`;
  document.body.appendChild(bd);
  bd.addEventListener("click", e=>{ if(e.target===bd) bd.remove(); });
  $("#epName").focus();

  $("#epSave").onclick = () => {
    const cur = STATE.inv.find(i=>i.name===name); if(!cur){ bd.remove(); return; }
    const updated = {
      id: cur.id,
      name: $("#epName").value.trim() || cur.name,
      price: parseFloat($("#epPrice").value)||0,
      stock: parseInt($("#epStock").value)||0,
      unit: cur.unit, low: cur.low
    };
    const it = Store.upsertItem(updated);   // absolute set (not increment)
    if(rowEl){
      rowEl.dataset.name = encodeURIComponent(it.name);
      rowEl.innerHTML = invRowHTML(it);
      rowEl.classList.toggle("low", it.stock<=it.low);
    }
    bd.remove(); bubble(`"${esc(it.name)}" update ho gaya — ₹${it.price}, stock ${it.stock}.`);
  };
  $("#epDelete").onclick = () => {
    Store.deleteItem(name);
    if(rowEl) rowEl.remove();
    bd.remove(); bubble(`"${esc(name)}" stock se hata diya.`);
  };
}

/* ---------- 12c. IN-APP ADD / IMPORT PRODUCTS ---------- */
// add new, or TOP UP stock of an existing product
function addOrIncrement(prod){
  const ex = STATE.inv.find(i=>i.name.toLowerCase()===(prod.name||"").toLowerCase());
  if(ex){
    const updated = { id:ex.id, name:ex.name, price:(prod.price||ex.price), stock:(ex.stock||0)+(prod.stock||0), unit:prod.unit||ex.unit, low:ex.low };
    Store.upsertItem(updated);
  } else {
    Store.upsertItem({ name:prod.name, price:prod.price||0, stock:prod.stock||0, unit:prod.unit||"pc", low:prod.low||5 });
  }
}
function mergeProducts(list){ list.forEach(addOrIncrement); }
function addProductToInv(prod){ addOrIncrement(prod); }

function openAddProduct(){
  const bd=document.createElement("div"); bd.className="sheet-backdrop"; bd.id="addsheet";
  bd.innerHTML=`
    <div class="sheet">
      <div class="sheet-logo">${svg('package',22)}</div>
      <h3>Add product</h3>
      <p>Naya product jodein ya stock badhayein</p>
      <input id="apName" class="cust-in" placeholder="Product name" autocomplete="off" />
      <div style="display:flex;gap:8px">
        <input id="apPrice" class="cust-in" type="number" inputmode="decimal" placeholder="Price ₹" />
        <input id="apQty" class="cust-in" type="number" inputmode="numeric" placeholder="Quantity" />
      </div>
      <button class="loc-btn" id="apAdd">${svg('check')} Add product</button>
      <button class="ghost-btn" id="apImport">${svg('upload')} Import from file (CSV)</button>
      <input type="file" id="apFile" accept=".csv,text/csv" hidden />
    </div>`;
  document.body.appendChild(bd);
  bd.addEventListener("click", e=>{ if(e.target===bd) bd.remove(); });
  $("#apName").focus();
  $("#apAdd").onclick = () => {
    const name=$("#apName").value.trim();
    if(!name){ $("#apName").classList.add("err"); $("#apName").focus(); return; }
    addProductToInv({ name, price:parseFloat($("#apPrice").value)||0, stock:parseInt($("#apQty").value)||0 });
    bd.remove(); bubble(`"${name}" stock me add ho gaya.`);
  };
  $("#apImport").onclick = () => $("#apFile").click();
  $("#apFile").onchange = async e => {
    const f=e.target.files[0]; if(!f) return; e.target.value="";
    try{ const items=await importCSVText(await f.text()); if(!items.length){ bubble("CSV me koi product nahi mila."); return; } mergeProducts(items); bd.remove(); bubble(`${items.length} products import ho gaye.`); }
    catch(err){ bubble("CSV padhne me dikkat aayi."); }
  };
}

/* ---------- 13. ONE-TIME UI INIT + BOOTSTRAP ---------- */
function initUI(){
  buildLangPicker();
  initVoice();
  wireAuthScreen();
  wireOnboarding();
  document.getElementById("logoutBtn").onclick = doLogout;
  document.getElementById("addBtn").onclick = openAddProduct;
  document.getElementById("chatsBtn").onclick = openChatsDrawer;

  // auto-save the conversation on any change (debounced) so reloads keep history
  try{ new MutationObserver(queueSaveChat).observe(chat, { childList:true, subtree:true, attributes:true, characterData:true }); }catch(e){}

  // language: saved choice, else locale guess (silent — greet happens on login)
  const stored = localStorage.getItem("bh_lang");
  const idx = (stored && LANGS.some(l=>l.id===stored)) ? langIndexById(stored) : langIndexById(detectFromLocale());
  applyLang(idx, false);

  // composer + hints + camera
  $("#composer").addEventListener("submit", e=>{
    e.preventDefault(); const v=$("#input").value.trim(); if(!v) return; $("#input").value=""; handle(v);
  });
  document.querySelectorAll(".hint").forEach(b=> b.onclick = () => { $("#input").value=b.textContent; $("#input").focus(); });
  const fileInput = $("#fileInput");
  $("#camBtn").onclick = () => fileInput.click();
  fileInput.onchange = e => { const f=e.target.files[0]; if(f) handleImage(f); e.target.value=""; };
  // paste (Cmd+V) and drag-drop an image anywhere → same OCR flow as the camera button
  document.addEventListener("paste", e => {
    const f = Array.from((e.clipboardData && e.clipboardData.files) || []).find(x => x.type.startsWith("image/"));
    if(f){ e.preventDefault(); handleImage(f); }
  });
  document.addEventListener("dragover", e => e.preventDefault());
  document.addEventListener("drop", e => {
    e.preventDefault();
    const f = Array.from((e.dataTransfer && e.dataTransfer.files) || []).find(x => x.type.startsWith("image/"));
    if(f) handleImage(f);
  });

  // auth bootstrap
  if(USE_FIREBASE) showAuth();      // db.js calls onShopAuth(...) when ready (or __bootLocal on failure)
  else window.__bootLocal();
}
initUI();
