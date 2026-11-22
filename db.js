/* ============================================================
   BillHero — Cloud layer (Firebase Auth + Firestore subcollections)
   One DB, many shops. Each shop owns:
     shops/{uid}                     ← profile
     shops/{uid}/inventory/{id}      ← one doc per product
     shops/{uid}/sales/{id}          ← one doc per bill
     shops/{uid}/customers/{id}      ← one doc per customer
     shops/{uid}/orders/{id}         ← (future) online orders
     shops/{uid}/rollups/{yyyy-mm-dd}← daily totals for fast reports
   Hardened: offline persistence, write retries, bounded listeners,
   atomic increment() stock. No config → app.js local auth + localStorage.
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
         doc, collection, onSnapshot, getDocs, setDoc, deleteDoc, writeBatch, query, orderBy, limit, increment, documentId, startAt }
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const cfg = (window.BILLHERO_CONFIG && window.BILLHERO_CONFIG.FIREBASE_CONFIG) || {};
const stripId = o => { const { id, ...rest } = o; return rest; };
const dayKey  = ts => new Date(ts).toISOString().slice(0, 10);

// retry a write once on transient failure (e.g. doc contention), then surface it
async function withRetry(fn, label){
  try { return await fn(); }
  catch (e1) {
    await new Promise(r => setTimeout(r, 500 + Math.random()*400));
    try { return await fn(); }
    catch (e2) { console.warn(label + " failed:", e2.message); if (window.__syncWarn) window.__syncWarn(); }
  }
}

if (cfg && cfg.apiKey) {
  try {
    const app  = initializeApp(cfg);
    const auth = getAuth(app);
    // offline persistence → writes queue across reloads and auto-retry when online
    let db;
    try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
    catch (e) { db = getFirestore(app); }

    let uid = null, pendingProfile = null;
    const itemRef = id => doc(db, "shops", uid, "inventory", id);
    const saleRef = id => doc(db, "shops", uid, "sales", id);
    const custRef = id => doc(db, "shops", uid, "customers", id);
    const rollRef = k  => doc(db, "shops", uid, "rollups", k);
    const col     = n  => collection(db, "shops", uid, n);

    window.BillHeroCloud = {
      ready: false,
      setItem(it)        { return withRetry(() => setDoc(itemRef(it.id), stripId(it), { merge:true }), "setItem"); },
      deleteItem(id)     { return withRetry(() => deleteDoc(itemRef(id)), "deleteItem"); },
      adjustStock(id, d) { return withRetry(() => setDoc(itemRef(id), { stock: increment(d) }, { merge:true }), "adjustStock"); },
      async setInventory(items){
        for (let i=0;i<items.length;i+=400){
          const slice = items.slice(i,i+400);
          await withRetry(() => { const b=writeBatch(db); slice.forEach(it=>b.set(itemRef(it.id), stripId(it), {merge:true})); return b.commit(); }, "setInventory");
        }
      },
      recordSale(sale){
        return withRetry(() => {
          const b = writeBatch(db);
          b.set(saleRef(sale.id), stripId(sale));
          sale.items.forEach(it => { if (it.id) b.set(itemRef(it.id), { stock: increment(-(it.qty||0)) }, { merge:true }); });
          const items = {}; sale.items.forEach(it => items[it.name] = increment(it.qty||0));
          b.set(rollRef(dayKey(sale.ts)), { date: dayKey(sale.ts), total: increment(sale.total||0), bills: increment(1), items }, { merge:true });
          return b.commit();
        }, "recordSale");
      },
      removeSale(sale){
        return withRetry(() => {
          const b = writeBatch(db);
          b.delete(saleRef(sale.id));
          sale.items.forEach(it => { if (it.id) b.set(itemRef(it.id), { stock: increment(it.qty||0) }, { merge:true }); });
          const items = {}; sale.items.forEach(it => items[it.name] = increment(-(it.qty||0)));
          b.set(rollRef(dayKey(sale.ts)), { date: dayKey(sale.ts), total: increment(-(sale.total||0)), bills: increment(-1), items }, { merge:true });
          return b.commit();
        }, "removeSale");
      },
      setCustomer(c){ return withRetry(() => setDoc(custRef(c.id), stripId(c), { merge:true }), "setCustomer"); },
      setOrder(o){ return withRetry(() => setDoc(doc(db,"shops",uid,"orders",o.id), stripId(o), { merge:true }), "setOrder"); },
      // chat sessions (each is a doc under shops/{uid}/chats)
      saveChat(id, title, html, dev){ return withRetry(() => setDoc(doc(db,"shops",uid,"chats",id), { title, html, dev: dev||"", updatedAt: Date.now() }, { merge:true }), "saveChat"); },
      deleteChat(id){ return withRetry(() => deleteDoc(doc(db,"shops",uid,"chats",id)), "deleteChat"); },
      async listChats(){
        const s = await getDocs(query(col("chats"), orderBy("updatedAt","desc"), limit(50)));
        return s.docs.map(d => ({ id:d.id, title:d.data().title||"Chat", updatedAt:d.data().updatedAt||0, html:d.data().html||"" }));
      },
      // live-watch one chat → fires on REMOTE changes only (ignores our own writes). Returns unsubscribe.
      watchChat(id, cb){
        return onSnapshot(doc(db,"shops",uid,"chats",id), snap => {
          if(snap.metadata.hasPendingWrites) return;
          const d = snap.exists() ? snap.data() : null;
          if(d) cb(d.html || "", d.dev || "");
        }, () => {});
      },
    };

    window.BillHeroAuth = {
      async signUp(p) {
        if (!p.email || !p.password || p.password.length < 6) throw new Error("Email and a 6+ character password are required.");
        const cred = await createUserWithEmailAndPassword(auth, p.email.trim(), p.password);
        pendingProfile = { shopName: p.shopName || "My Shop", ownerName: p.ownerName || "", city: p.city || "", email: p.email.trim() };
        return { uid: cred.user.uid, ...pendingProfile };
      },
      async signIn(email, password) { const cred = await signInWithEmailAndPassword(auth, (email||"").trim(), password||""); return { uid: cred.user.uid, email: cred.user.email || "" }; },
      async signOut() { await signOut(auth); }
    };

    onAuthStateChanged(auth, user => {
      if (!user) { window.onShopAuth(null); return; }
      uid = user.uid;
      const shopRef = doc(db, "shops", uid);
      let announced = false;
      onSnapshot(shopRef, snap => {
        const data = snap.exists() ? snap.data() : null;
        if (!snap.exists()) {
          setDoc(shopRef, { ...(pendingProfile || {}), created: Date.now() }, { merge:true }).catch(()=>{});
        }
        if (!window.BillHeroCloud.ready) { window.BillHeroCloud.ready = true; window.__cloudStatus(true); attachCollections(); }
        if (!announced) {
          announced = true;
          window.onShopAuth({
            uid, email: user.email || "",
            shopName:  (data && data.shopName)  || (pendingProfile && pendingProfile.shopName)  || "My Shop",
            ownerName: (data && data.ownerName) || (pendingProfile && pendingProfile.ownerName) || "",
            city:      (data && data.city)      || (pendingProfile && pendingProfile.city)      || "",
            isNew: !snap.exists()
          });
        }
      }, err => { console.warn("shop snapshot:", err.message); window.onShopAuth({ uid, email: user.email || "", shopName: "My Shop", isNew:false }); });
    });

    function attachCollections() {
      // inventory: full (a shop has hundreds of SKUs, needed for billing)
      onSnapshot(col("inventory"), s => window.__setInventory(s.docs.map(d => ({ id:d.id, ...d.data() }))), e => console.warn("inv", e.message));
      // sales: latest 100 only (undo + recent view) — history lives in rollups
      onSnapshot(query(col("sales"), orderBy("ts","desc"), limit(100)), s => window.__setSales(s.docs.map(d => ({ id:d.id, ...d.data() }))), e => console.warn("sales", e.message));
      // customers: 300 most recent (prevents unbounded load)
      onSnapshot(query(col("customers"), orderBy("ts","desc"), limit(300)), s => window.__setCustomers(s.docs.map(d => ({ id:d.id, ...d.data() }))), e => console.warn("cust", e.message));
      // supplier orders: latest 50
      onSnapshot(query(col("orders"), orderBy("ts","desc"), limit(50)), s => window.__setOrders(s.docs.map(d => ({ id:d.id, ...d.data() }))), e => console.warn("orders", e.message));
      // rollups: last ~120 days by doc id (id IS the date "yyyy-mm-dd"). Ascending range
      // from a cutoff date uses Firestore's BUILT-IN __name__ index — no composite index needed
      // (descending orderBy(documentId()) demanded one and errored).
      const cutoff = new Date(Date.now() - 120*86400000).toISOString().slice(0,10);
      onSnapshot(query(col("rollups"), orderBy(documentId()), startAt(cutoff), limit(200)), s => { const m={}; s.docs.forEach(d => { const x=d.data(); m[d.id] = { total:x.total||0, bills:x.bills||0, items:x.items||{} }; }); window.__setRollups(m); }, e => console.warn("roll", e.message));
    }

  } catch (e) {
    console.warn("Firebase init failed — falling back to local:", e.message);
    window.BillHeroCloud = null;
    if (window.__bootLocal) window.__bootLocal();
  }
} else {
  window.BillHeroCloud = null; // no config → app.js local auth + localStorage
}
