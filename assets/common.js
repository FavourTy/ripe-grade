// Ripe & Grade: shared code for all pages.
(function () {
  "use strict";
  var cfg = window.RG_CONFIG || {};
  var configured = cfg.SUPABASE_URL && cfg.SUPABASE_URL.indexOf("YOUR-PROJECT") < 0 &&
                   cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_ANON_KEY.indexOf("YOUR-") < 0;

  var RG = {
    configured: configured,
    sb: configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null,
    BUCKET: "produce",
    MAX_PHOTOS: 8,

    RIPENESS: [
      [1, "All green", "var(--r1)"], [2, "Starting to turn", "var(--r2)"], [3, "Half and half", "var(--r3)"],
      [4, "Mostly yellow", "var(--r4)"], [5, "Ripe, some spots", "var(--r5)"], [6, "Overripe", "var(--r6)"]
    ],
    CROPS: [["beans", "Beans"], ["banana", "Banana"], ["plantain", "Plantain"], ["pawpaw", "Pawpaw"]],
    DEFECTS: {
      beans: ["Weevil holes", "Live insects", "Mould", "Broken or split", "Shrivelled", "Discoloured", "Stones or sand", "Chaff or other seeds", "Powdery seeds"],
      fruit: ["Bruises", "Cuts or cracks", "Soft or rotten spots", "Black patches", "Insect damage", "Disease spots", "Latex stains", "Overripe"]
    },
    SIGNS: {
      beans: ["Strong chemical smell", "Powder residue", "Oily or wet look", "Unusually shiny", "Dead insects present"],
      fruit: ["Very even colour", "Stalk or stem still green", "Dark or black stem", "Black blotches", "Yellow skin but hard flesh", "Strong chemical smell", "Spoiled quickly"]
    },
    SOURCES: [["market", "Open market"], ["supermarket", "Supermarket"], ["roadside", "Roadside seller"], ["farm", "Farm"], ["own", "Own tree or garden"], ["other", "Other"]],
    CLAIMS: {
      fruit: [["natural", "Ripened naturally"], ["chemical", "Used carbide or a chemical"], ["not-said", "Didn't say"], ["not-asked", "I didn't ask"]],
      beans: [["untreated", "No chemical used"], ["chemical", "Used a preservative"], ["not-said", "Didn't say"], ["not-asked", "I didn't ask"]]
    },
    TREATMENTS: {
      fruit: [["known-natural", "Known: natural ripening"], ["known-carbide", "Known: calcium carbide (lab batch)"], ["known-other", "Known: other ripening agent"], ["unknown", "Unknown"]],
      beans: [["known-untreated", "Known: untreated (lab confirmed)"], ["known-treated", "Known: treated with preservative (lab confirmed)"], ["unknown", "Unknown"]]
    },
    VIEWS: {
      beans: ["Tray, top", "Close-up", "Tag"],
      banana: ["Side", "Top", "Stalk close-up", "Marks close-up", "Tag"],
      plantain: ["Side", "Top", "Stalk close-up", "Marks close-up", "Tag"],
      pawpaw: ["Side A", "Side B", "Stem end", "Cut open", "Tag"]
    },
    LABEL: { beans: "Beans", banana: "Banana", plantain: "Plantain", pawpaw: "Pawpaw", grading: "Grading", chemical: "Chemical", crowd: "Crowd", trusted: "Trusted" }
  };

  RG.$ = function (id) { return document.getElementById(id); };
  RG.el = function (tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null) return;
      if (k === "text") n.textContent = v;
      else if (k === "class") n.className = v;
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  };
  RG.store = function (k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  };
  RG.radio = function (name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; };
  RG.checked = function (box) { return Array.prototype.map.call(box.querySelectorAll("input:checked"), function (i) { return i.value; }); };
  RG.pad = function (n) { return String(n).padStart(2, "0"); };
  RG.uuid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });
  };
  RG.deviceId = function () {
    var id = RG.store("rg-device");
    if (!id) { id = RG.uuid(); RG.store("rg-device", id); }
    return id;
  };
  RG.fmtDate = function (iso) {
    if (!iso) return "";
    var d = new Date(iso); if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) + " " + RG.pad(d.getHours()) + ":" + RG.pad(d.getMinutes());
  };
  RG.localNow = function () {
    var d = new Date();
    return d.getFullYear() + "-" + RG.pad(d.getMonth() + 1) + "-" + RG.pad(d.getDate()) + "T" + RG.pad(d.getHours()) + ":" + RG.pad(d.getMinutes());
  };
  RG.stageName = function (v) {
    for (var i = 0; i < RG.RIPENESS.length; i++) if (RG.RIPENESS[i][0] === Number(v)) return v + " " + RG.RIPENESS[i][1];
    return "";
  };
  RG.optionText = function (list, value) {
    for (var i = 0; i < list.length; i++) if (list[i][0] === value) return list[i][1];
    return value || "";
  };

  // ---- builders ----
  RG.buildRipeness = function (box, name) {
    box.innerHTML = "";
    RG.RIPENESS.forEach(function (r) {
      var id = name + "-" + r[0];
      var span = RG.el("span", { text: r[1] }); span.style.setProperty("--c", r[2]);
      box.appendChild(RG.el("label", { for: id }, [RG.el("input", { type: "radio", name: name, value: String(r[0]), id: id }), span]));
    });
  };
  RG.buildChips = function (box, list, prefix, type, name) {
    box.innerHTML = "";
    list.forEach(function (t, i) {
      var value = Array.isArray(t) ? t[0] : t, text = Array.isArray(t) ? t[1] : t;
      var id = prefix + "-" + i;
      box.appendChild(RG.el("label", { class: "chip", for: id }, [
        RG.el("input", { type: type || "checkbox", value: value, id: id, name: name || null }),
        RG.el("span", { text: text })
      ]));
    });
  };

  // ---- photos ----
  // Shrinks a photo to at most 1600 px on the long side and re-encodes as JPEG (~200-400 KB).
  RG.resize = function (file, max) {
    max = max || 1600;
    var load = window.createImageBitmap
      ? createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () { return createImageBitmap(file); })
      : Promise.reject(new Error("no-bitmap"));
    return load.then(function (bmp) {
      var s = Math.min(1, max / Math.max(bmp.width, bmp.height));
      var w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(bmp, 0, 0, w, h);
      return new Promise(function (res, rej) {
        c.toBlob(function (b) { b ? res({ blob: b, w: w, h: h }) : rej(new Error("encode")); }, "image/jpeg", 0.85);
      });
    }).catch(function () {
      if (/^image\/(jpeg|png|webp)$/.test(file.type) && file.size <= 4194304) return { blob: file, w: null, h: null };
      var e = new Error("unreadable"); e.code = "unreadable"; throw e;
    });
  };

  // Uploads photos [{file, view}] into folder ("crowd" or "trusted"). onProgress(done, total).
  RG.uploadPhotos = function (photos, folder, onProgress) {
    var d = new Date();
    var day = d.getFullYear() + "-" + RG.pad(d.getMonth() + 1) + "-" + RG.pad(d.getDate());
    var out = [], i = 0;
    function next() {
      if (i >= photos.length) return Promise.resolve(out);
      var p = photos[i];
      return RG.resize(p.file).then(function (r) {
        var ext = r.blob.type === "image/png" ? "png" : r.blob.type === "image/webp" ? "webp" : "jpg";
        var path = folder + "/" + day + "/" + RG.uuid() + "." + ext;
        return RG.sb.storage.from(RG.BUCKET).upload(path, r.blob, { contentType: r.blob.type || "image/jpeg", upsert: false })
          .then(function (res) {
            if (res.error) { var e = new Error(res.error.message); e.code = "upload"; throw e; }
            out.push({ path: path, view: p.view || null, w: r.w, h: r.h });
            i++; if (onProgress) onProgress(i, photos.length);
            return next();
          });
      });
    }
    return next();
  };

  // A small photo picker: renders thumbnails into `box`, keeps state in `state.photos`.
  RG.photoPicker = function (opts) {
    var state = { photos: [] };
    function views() { return opts.views ? opts.views() : null; }
    function render() {
      opts.box.innerHTML = "";
      state.photos.forEach(function (p, i) {
        var kids = [RG.el("img", { src: p.url, alt: "Photo " + (i + 1) })];
        var ctl = RG.el("div", { class: "tctl" });
        var v = views();
        if (v) {
          if (v.indexOf(p.view) < 0) p.view = v[Math.min(i, v.length - 1)];
          var sel = RG.el("select", { "aria-label": "View for photo " + (i + 1), id: "view-" + i });
          v.forEach(function (x) { var o = RG.el("option", { value: x, text: x }); if (x === p.view) o.selected = true; sel.appendChild(o); });
          sel.addEventListener("change", function () { p.view = sel.value; });
          ctl.appendChild(sel);
        } else {
          ctl.appendChild(RG.el("span", { class: "hint", text: "Photo " + (i + 1), style: "margin-right:auto" }));
        }
        ctl.appendChild(RG.el("button", { type: "button", "aria-label": "Remove photo " + (i + 1), text: "×", onclick: function () {
          URL.revokeObjectURL(p.url); state.photos.splice(i, 1); render(); if (opts.onChange) opts.onChange();
        } }));
        kids.push(ctl);
        opts.box.appendChild(RG.el("div", { class: "thumb" }, kids));
      });
    }
    state.add = function (files) {
      Array.prototype.forEach.call(files, function (f) {
        if (state.photos.length >= (opts.max || RG.MAX_PHOTOS)) return;
        if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)) return;
        var v = views();
        state.photos.push({ file: f, url: URL.createObjectURL(f), view: v ? v[Math.min(state.photos.length, v.length - 1)] : null });
      });
      render(); if (opts.onChange) opts.onChange();
    };
    state.clear = function () { state.photos.forEach(function (p) { URL.revokeObjectURL(p.url); }); state.photos = []; render(); if (opts.onChange) opts.onChange(); };
    state.render = render;
    (opts.inputs || []).forEach(function (inp) { inp.addEventListener("change", function () { state.add(inp.files); inp.value = ""; }); });
    return state;
  };

  RG.errorText = function (err) {
    var m = (err && (err.message || err.error_description)) || "";
    if (err && err.code === "unreadable") return "One photo couldn't be read. On iPhone, set Camera > Formats to Most Compatible, or choose a JPG.";
    if (/payload too large|exceeded the maximum allowed size|413/i.test(m)) return "One photo is too large. Take it again or choose a smaller photo.";
    if (/mime type|not supported/i.test(m)) return "That file type isn't supported. Use a JPG or PNG photo.";
    if (/row-level security|violates|permission|not authorized|JWT/i.test(m)) return "You don't have permission to do that. Sign in again, or ask the project owner to add you.";
    if (/Failed to fetch|NetworkError|network/i.test(m)) return "No connection. Check your data or Wi-Fi and try again.";
    return "Something went wrong: " + (m || "unknown error") + ". Try again.";
  };

  RG.notConfiguredNote = function (box) {
    box.hidden = false;
    box.className = "notice warn";
    box.textContent = "This site isn't connected to its database yet. The owner needs to add the Supabase URL and anon key in config.js.";
  };

  window.RG = RG;
})();
