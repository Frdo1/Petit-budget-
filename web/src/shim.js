/* Stockage local hors ligne : remplace la base partagée de la version en ligne. */
(function(){
  var KEY = "pbs-data-v1";
  var data = null;
  try { if (window.__PBS_DATA__ && typeof window.__PBS_DATA__ === "object") data = window.__PBS_DATA__; } catch (e) {}
  if (!data) { try { data = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {} }
  if (!data || typeof data !== "object" || !data.c) data = { c: {} };
  if (!data.dev) data.dev = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  var listeners = [];
  var clone = function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); };
  function save() {
    try {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: "save", data: data }));
      else localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {}
  }
  function col(p) { return data.c[p] || (data.c[p] = {}); }
  function split(path) { var i = path.lastIndexOf("/"); return [path.slice(0, i), path.slice(i + 1)]; }
  function snapDoc(id, body) {
    return { id: id, exists: !!body, data: function () { return body ? clone(body) : undefined; }, metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function match(body, f) {
    if (!f) return true;
    var v = body[f.field];
    if (f.op === "in") return f.value.indexOf(v) >= 0;
    if (f.op === "==") return v === f.value;
    return true;
  }
  function colSnap(p, f) {
    var c = col(p);
    var docs = Object.keys(c).sort().filter(function (id) { return match(c[id], f); }).map(function (id) { return snapDoc(id, c[id]); });
    return { docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return []; }, metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function notify() {
    listeners.slice().forEach(function (l) {
      try {
        if (l.kind === "col") l.fn(colSnap(l.path, l.f));
        else { var s = split(l.path); l.fn(snapDoc(s[1], col(s[0])[s[1]])); }
      } catch (e) { console.error(e); }
    });
  }
  function changed() { save(); setTimeout(notify, 0); }
  function ts(b) { return (b && (b.cree || b.date)) || ""; }
  function sumDev(b) { var t = 0; for (var k in b) t += (+b[k] || 0); return t; }

  function docRef(path) {
    var s = split(path);
    return {
      id: s[1], path: path,
      get: function () { return Promise.resolve(snapDoc(s[1], col(s[0])[s[1]])); },
      set: function (d) {
        var b = clone(d);
        if (!b.cree && !b.date) b.cree = new Date().toISOString();
        if (s[0] === "produits") { b.byDev = {}; b.byDev[data.dev] = +b.achats || 0; }
        col(s[0])[s[1]] = b; changed(); return Promise.resolve();
      },
      update: function (d) {
        var c = col(s[0]), cur = c[s[1]];
        if (!cur) return Promise.reject({ code: "invalid_argument", message: "Document absent" });
        d = clone(d);
        if (s[0] === "produits" && "achats" in d) {
          // compteur par téléphone, pour que la fusion additionne les achats des deux téléphones
          if (!cur.byDev) { cur.byDev = {}; cur.byDev[data.dev] = +cur.achats || 0; }
          var delta = (+d.achats || 0) - (+cur.achats || 0);
          cur.byDev[data.dev] = Math.max(0, (+cur.byDev[data.dev] || 0) + delta);
          d.achats = sumDev(cur.byDev);
        }
        Object.assign(cur, d); changed(); return Promise.resolve();
      },
      delete: function () {
        delete col(s[0])[s[1]];
        data.del = data.del || {}; data.del[path] = new Date().toISOString();
        changed(); return Promise.resolve();
      },
      onSnapshot: function (fn) {
        var l = { kind: "doc", path: path, fn: fn }; listeners.push(l);
        setTimeout(function () { fn(snapDoc(s[1], col(s[0])[s[1]])); }, 0);
        return function () { listeners = listeners.filter(function (x) { return x !== l; }); };
      }
    };
  }
  function query(p, f) {
    var q = {
      where: function (field, op, value) { return query(p, { field: field, op: op, value: value }); },
      orderBy: function () { return q; }, limit: function () { return q; },
      get: function () { return Promise.resolve(colSnap(p, f)); },
      onSnapshot: function (fn) {
        var l = { kind: "col", path: p, f: f, fn: fn }; listeners.push(l);
        setTimeout(function () { fn(colSnap(p, f)); }, 0);
        return function () { listeners = listeners.filter(function (x) { return x !== l; }); };
      }
    };
    return q;
  }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function colRef(p) {
    var q = query(p, null);
    q.path = p;
    q.doc = function (id) { return docRef(p + "/" + (id || newId())); };
    q.add = function (d) { var r = q.doc(); return r.set(d).then(function () { return r; }); };
    return q;
  }
  var db = { doc: docRef, collection: colRef };

  /* Export / fusion pour synchroniser deux téléphones */
  window.PBS_LOCAL = {
    exportText: function () { return "PBS1" + JSON.stringify({ c: data.c, del: data.del || {} }); },
    merge: function (txt) {
      txt = String(txt || "").trim();
      var i = txt.indexOf("PBS1");
      if (i < 0) throw new Error("format");
      var inc = JSON.parse(txt.slice(i + 4));
      if (!inc || typeof inc.c !== "object") throw new Error("format");
      var added = 0, updated = 0;
      var dels = Object.assign({}, data.del || {}, inc.del || {});
      for (var p in inc.c) {
        var src = inc.c[p] || {}, dst = col(p);
        for (var id in src) {
          if (dels[p + "/" + id] && dels[p + "/" + id] >= ts(src[id])) continue;
          var a = dst[id], b = src[id];
          if (!a) { dst[id] = clone(b); added++; continue; }
          if (p === "produits") {
            var A = a.byDev || { legacyA: +a.achats || 0 }, B = b.byDev || { legacyB: +b.achats || 0 }, m = {};
            for (var k in A) m[k] = +A[k] || 0;
            for (var k2 in B) m[k2] = Math.max(m[k2] || 0, +B[k2] || 0);
            var before = a.achats;
            a.byDev = m; a.achats = sumDev(m);
            if (b.dernier && (!a.dernier || b.dernier > a.dernier)) a.dernier = b.dernier;
            if (!(typeof a.prix === "number" && a.prix > 0) && typeof b.prix === "number" && b.prix > 0) { a.prix = b.prix; a.unite = b.unite; }
            if (a.achats !== before) updated++;
          }
        }
      }
      for (var path in dels) { var s = split(path); var cc = data.c[s[0]]; if (cc && cc[s[1]] && dels[path] >= ts(cc[s[1]])) delete cc[s[1]]; }
      data.del = dels;
      changed();
      return { added: added, updated: updated };
    }
  };

  window.PBS_OFFLINE = true;
  window.claude = {
    use: function (name) {
      if (name === "db") return Promise.resolve(db);
      if (name === "user") return Promise.resolve({ can: function () { return Promise.resolve(true); }, isOwner: function () { return true; } });
      return Promise.resolve(null);
    }
  };
  save();
})();
