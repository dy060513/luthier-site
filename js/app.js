/* ============================================================
   拾弦提琴工坊 · 展销会手机官网  —  SPA logic
   Hash routing · data-driven · favorites · search · lightbox
   ============================================================ */
(function () {
  "use strict";

  var DATA = null;
  var FAV_KEY = "shixian.fav.v1";
  var favs = loadFavs();

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var seriesOf = function (id) { return (DATA.series || []).find(function (s) { return s.id === id; }); };
  var itemOf = function (id) { return (DATA.instruments || []).find(function (i) { return i.id === id; }); };
  var tagOf = function (id) { return (DATA.tags || []).find(function (t) { return t.id === id; }); };
  var tagHtml = function (tid) {
    var t = tagOf(tid);
    if (!t) return "";
    return '<span class="tag tag-' + esc(t.tone || "outline") + '">' + esc(t.label) + "</span>";
  };
  var priceHtml = function (i) {
    var p = (i.price || "").toString();
    var negotiable = /面议|议/i.test(p);
    return '<span class="price' + (negotiable ? " negotiable" : "") + '">' + esc(p) + "</span>";
  };
  var favSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 20s-7.5-4.6-9.5-9C1 7.5 3.4 5 6.2 5c1.9 0 3.6 1 4.6 2.6h2.4C14.2 6 15.9 5 17.8 5 20.6 5 23 7.5 21.5 11c-2 4.4-9.5 9-9.5 9z"/></svg>';

  /* Safe storage access (private mode / disabled cookies must not break the UI) */
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    sget: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- favorites persistence ---------- */
  function loadFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveFavs() { try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {} }
  function isFav(id) { return favs.indexOf(id) !== -1; }
  function toggleFav(id) {
    var idx = favs.indexOf(id);
    if (idx === -1) { favs.push(id); toast("已加入收藏"); }
    else { favs.splice(idx, 1); toast("已取消收藏"); }
    saveFavs();
    updateFavBadge();
    // re-render fav buttons on current view without losing scroll
    var cur = document.querySelectorAll('[data-fav="' + id + '"]');
    cur.forEach(function (b) { b.classList.toggle("on", isFav(id)); });
  }
  function updateFavBadge() {
    var badge = $("favCount");
    badge.hidden = favs.length === 0;
    badge.textContent = favs.length > 99 ? "99+" : String(favs.length);
  }

  /* ---------- toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(function () { t.classList.add("show"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.hidden = true; }, 300);
    }, 2000);
  }

  /* ---------- router ---------- */
  function parseHash() {
    var h = location.hash.replace(/^#/, "") || "/";
    var parts = h.split("/").filter(Boolean);
    if (parts.length === 0) return { name: "home" };
    if (parts[0] === "series" && parts[1]) return { name: "series", id: parts[1] };
    if (parts[0] === "item" && parts[1]) return { name: "item", id: parts[1] };
    if (parts[0] === "favorites") return { name: "favorites" };
    if (parts[0] === "search") return { name: "search" };
    if (parts[0] === "admin") return { name: "admin" };
    return { name: "home" };
  }

  function route() {
    try {
      var r = parseHash();
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
      updateRail(r);
      if (!DATA) { renderSkeleton(); return; }
      if (r.name === "home") renderHome();
      else if (r.name === "series") renderSeries(r.id);
      else if (r.name === "item") renderDetail(r.id);
      else if (r.name === "favorites") renderFavorites();
      else if (r.name === "search") renderSearch();
      else if (r.name === "admin") renderAdmin();
      else renderHome();
    } catch (e) {
      console.error("[luthier-site] route error:", e);
      renderError();
    }
  }

  /* ---------- skeleton & error ---------- */
  function renderSkeleton() {
    var cards = "";
    for (var i = 0; i < 3; i++) {
      cards += '<div class="sk-card"><div class="sk-media"></div><div class="sk-body">' +
        '<div class="sk-line w60"></div><div class="sk-line w80"></div><div class="sk-line w40"></div></div></div>';
    }
    $("view").innerHTML = '<section style="padding-top:40px"><div class="grid-list">' + cards + "</div></section>";
  }
  function renderError() {
    $("view").innerHTML =
      '<section><div class="empty"><h3>数据加载失败</h3><p>请确认 data/instruments.json 存在且格式正确。</p>' +
      '<button class="btn btn-solid" onclick="location.reload()">重新加载</button></div></section>';
  }

  /* ---------- home ---------- */
  function renderHome() {
    document.title = DATA.site.brandName + " · 手工提琴";
    var s = DATA.site, series = DATA.series.slice().sort(function (a, b) { return a.order - b.order; });
    var seriesRows = series.map(function (sx, i) {
      return '<a class="series-row" href="#/series/' + esc(sx.id) + '">' +
        '<span class="series-num">0' + (i + 1) + "</span>" +
        '<span><h2>' + esc(sx.name) + '</h2><p class="en">' + esc(sx.en) + "</p></span>" +
        '<span class="series-desc">' + esc(sx.description) + "</span>" +
        '<span class="series-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5l7 7-7 7"/></svg></span></a>';
    }).join("");

    $("view").innerHTML =
      '<section class="hero">' +
        '<p class="eyebrow reveal">' + esc(s.brandNameEn) + "</p>" +
        '<h1 class="reveal">' + esc(s.brandName) + "</h1>" +
        '<p class="hero-tagline reveal">' + esc(s.tagline) + "</p>" +
        '<p class="hero-en reveal">' + esc(s.brandNameEn) + " · EST. MMXXVI</p>" +
        '<div class="expo reveal">' +
          '<div class="expo-head"><span class="expo-title">' + esc(s.expo.title) + '</span><span class="expo-badge">现场试奏</span></div>' +
          '<div class="expo-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg><span>' + esc(s.expo.dates) + " · " + esc(s.expo.venue) + "</span></div>" +
          '<p class="expo-note">' + esc(s.expo.note) + "</p>" +
        "</div>" +
      "</section>" +
      '<section class="series-index"><p class="series-index-title">琴系列 · Collection</p>' + seriesRows + "</section>";
    observeReveals();
  }

  /* ---------- instrument card ---------- */
  function cardHtml(i, opts) {
    opts = opts || {};
    var sx = seriesOf(i.series);
    var specs = (i.params || []).slice(0, 2).map(function (p) { return p.k + "：" + p.v; }).join(" · ");
    return '<article class="instrument-card reveal" data-item="' + esc(i.id) + '" role="button" tabindex="0" aria-label="查看 ' + esc(i.name) + '">' +
      '<div class="card-media">' +
        '<img src="' + esc(i.image) + '" alt="' + esc(i.name) + '" loading="lazy" decoding="async" data-fallback="' + esc(sx ? sx.image : "") + '">' +
        '<button class="fav-btn' + (isFav(i.id) ? " on" : "") + '" data-fav="' + esc(i.id) + '" aria-label="收藏" aria-pressed="' + isFav(i.id) + '">' + favSvg + "</button>" +
        '<span class="zoom-hint">点击放大</span>' +
      "</div>" +
      '<div class="card-body">' +
        '<h3 class="card-name">' + esc(i.name) + "</h3>" +
        '<div class="chip-row">' + (i.tags || []).map(tagHtml).join("") + "</div>" +
        '<p class="card-specs">' + esc(specs) + "</p>" +
        '<div class="card-foot">' + priceHtml(i) + '<span class="card-more">详情</span></div>' +
      "</div></article>";
  }

  function gridHtml(items) {
    if (!items.length) {
      return '<div class="empty"><h3>没有找到琴款</h3><p>换个关键词或筛选条件试试。</p></div>';
    }
    return '<div class="grid-list">' + items.map(cardHtml).join("") + "</div>";
  }

  /* ---------- series page ---------- */
  function renderSeries(id) {
    var sx = seriesOf(id);
    if (!sx) { location.hash = "#/"; return; }
    var items = DATA.instruments.filter(function (i) { return i.series === id; });
    var activeTag = store.sget("series-tag-" + id) || "all";
    var filtered = activeTag === "all" ? items : items.filter(function (i) { return (i.tags || []).indexOf(activeTag) !== -1; });
    var tagIds = [];
    items.forEach(function (i) { (i.tags || []).forEach(function (t) { if (tagIds.indexOf(t) === -1) tagIds.push(t); }); });

    document.title = sx.name + " · " + DATA.site.brandName;
    var chips = '<button class="filter-chip' + (activeTag === "all" ? " active" : "") + '" data-filter="all">全部</button>' +
      tagIds.map(function (t) {
        var tag = tagOf(t);
        return '<button class="filter-chip' + (activeTag === t ? " active" : "") + '" data-filter="' + esc(t) + '">' + esc(tag ? tag.label : t) + "</button>";
      }).join("");

    $("view").innerHTML =
      '<section class="page-head">' +
        '<div class="back-row"><a class="back-pill" href="#/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>返回</a></div>' +
        '<span class="eyebrow">' + esc(sx.en) + " · Series</span>" +
        "<h1>" + esc(sx.name) + "</h1>" +
        '<p class="page-desc">' + esc(sx.description) + "</p>" +
        '<div class="chip-row" style="margin-top:18px">' + chips + "</div>" +
        '<p class="result-count">共 ' + filtered.length + " 款</p>" +
      "</section>" +
      "<section>" + gridHtml(filtered) + "</section>";
    observeReveals();
  }

  /* ---------- detail ---------- */
  function renderDetail(id) {
    var i = itemOf(id);
    if (!i) { location.hash = "#/"; return; }
    var sx = seriesOf(i.series);
    document.title = i.name + " · " + DATA.site.brandName;
    var params = (i.params || []).map(function (p) {
      return '<div class="param-row"><dt>' + esc(p.k) + "</dt><dd>" + esc(p.v) + "</dd></div>";
    }).join("");

    $("view").innerHTML =
      '<section class="detail">' +
        '<div class="detail-head">' +
          '<a class="back-link" href="#/series/' + esc(i.series) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 5l-7 7 7 7"/></svg>返回 ' + esc(sx ? sx.name : "") + "</a>" +
        "</div>" +
        '<div class="detail-media reveal">' +
          '<img id="detailImg" src="' + esc(i.image) + '" alt="' + esc(i.name) + '" data-fallback="' + esc(sx ? sx.image : "") + '" data-full="' + esc(i.image) + '">' +
          '<button class="fav-btn' + (isFav(i.id) ? " on" : "") + '" data-fav="' + esc(i.id) + '" aria-label="收藏" aria-pressed="' + isFav(i.id) + '">' + favSvg + "</button>" +
        "</div>" +
        '<div class="detail-title reveal">' +
          '<h1>' + esc(i.name) + "</h1>" +
          '<p class="detail-series">' + esc(sx ? sx.en : "") + " · " + esc(sx ? sx.name : "") + "</p>" +
          '<div class="chip-row detail-tags">' + (i.tags || []).map(tagHtml).join("") + "</div>" +
          '<div class="detail-price">' + priceHtml(i) + "</div>" +
          (i.note ? '<p class="detail-note">' + esc(i.note) + "</p>" : "") +
        "</div>" +
        '<div class="param-table reveal">' + params + "</div>" +
        '<div class="detail-actions reveal">' +
          '<button class="btn btn-solid" id="dContactWechat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8.5 5C4.9 5 2 7.4 2 10.4c0 1.7.9 3.2 2.4 4.2L3.8 17l2.6-1.3c.7.2 1.4.3 2.1.3h.4"/><path d="M14 9.6c3.5 0 6.3 2.2 6.3 5 0 1.6-.9 3-2.2 4l.7 2.4-3.1-1.5a7.6 7.6 0 0 1-1.7.2c-3.5 0-6.3-2.2-6.3-5s2.8-5 6.3-5z"/></svg>加微信咨询</button>' +
          '<div class="btn-row">' +
            '<a class="btn btn-outline" href="tel:' + esc(String(DATA.contact.phone).replace(/[^0-9]/g, "")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>拨打电话</a>' +
            '<button class="btn btn-outline" id="dShare"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="12" r="2.6"/><circle cx="17.5" cy="5.5" r="2.6"/><circle cx="17.5" cy="18.5" r="2.6"/><path d="m8.4 10.8 6.8-4m-6.8 6.4 6.8 4"/></svg>分享</a>' +
          "</div>" +
        "</div>" +
      "</section>";

    $("dContactWechat").addEventListener("click", function () {
      copyText(DATA.contact.wechat, "微信号已复制：" + DATA.contact.wechat);
    });
    $("dShare").addEventListener("click", function () { sharePage(i.name); });
    $("detailImg").addEventListener("click", function (e) {
      openLightbox(e.target.dataset.full, i.name);
    });
    observeReveals();
  }

  /* ---------- favorites ---------- */
  function renderFavorites() {
    document.title = "我的收藏 · " + DATA.site.brandName;
    var items = favs.map(itemOf).filter(Boolean);
    $("view").innerHTML =
      '<section class="page-head"><span class="eyebrow">Favorites</span><h1>我的收藏</h1>' +
      '<p class="page-desc">把想细看的琴收在这里，展销会现场逐一试奏。</p></section><section>' +
      (items.length
        ? gridHtml(items)
        : '<div class="empty"><div class="empty-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 20s-7.5-4.6-9.5-9C1 7.5 3.4 5 6.2 5c1.9 0 3.6 1 4.6 2.6h2.4C14.2 6 15.9 5 17.8 5 20.6 5 23 7.5 21.5 11c-2 4.4-9.5 9-9.5 9z"/></svg></div>' +
          "<h3>尚未收藏任何琴款</h3><p>浏览琴款时点击图片右上角的心形即可收藏。</p>" +
          '<a class="btn btn-solid" href="#/">浏览全部琴款</a></div>') +
      "</section>";
    observeReveals();
  }

  /* ---------- search ---------- */
  function renderSearch() {
    document.title = "搜索 · " + DATA.site.brandName;
    var q = store.sget("search-q") || "";
    var sFilter = store.sget("search-series") || "all";
    var tFilter = store.sget("search-tag") || "all";
    var seriesChips = '<button class="filter-chip' + (sFilter === "all" ? " active" : "") + '" data-sf="all">全部系列</button>' +
      DATA.series.map(function (s) {
        return '<button class="filter-chip' + (sFilter === s.id ? " active" : "") + '" data-sf="' + esc(s.id) + '">' + esc(s.name) + "</button>";
      }).join("");
    var tagChips = '<button class="filter-chip' + (tFilter === "all" ? " active" : "") + '" data-tf="all">全部标签</button>' +
      DATA.tags.map(function (t) {
        return '<button class="filter-chip' + (tFilter === t.id ? " active" : "") + '" data-tf="' + esc(t.id) + '">' + esc(t.label) + "</button>";
      }).join("");

    var results = filterItems(q, sFilter, tFilter);
    $("view").innerHTML =
      '<section class="page-head">' +
        '<span class="eyebrow">Search</span><h1>搜索琴款</h1>' +
        '<div class="search-box" style="margin-top:20px">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
          '<input id="searchInput" type="search" placeholder="输入琴名、用材、系列…" value="' + esc(q) + '">' +
        "</div>" +
        '<div class="chip-row" style="margin-top:16px">' + seriesChips + "</div>" +
        '<div class="chip-row" style="margin-top:10px">' + tagChips + "</div>" +
        '<p class="result-count">找到 ' + results.length + " 款</p>" +
      "</section>" +
      "<section>" + gridHtml(results) + "</section>";

    var input = $("searchInput");
    var t = null;
    input.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        store.sset("search-q", input.value);
        renderSearch(); // cheap re-render keeps state via sessionStorage
        var el = document.querySelector(".search-box input");
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      }, 180);
    });
    observeReveals();
  }

  function filterItems(q, sFilter, tFilter) {
    q = (q || "").trim().toLowerCase();
    return DATA.instruments.filter(function (i) {
      if (sFilter !== "all" && i.series !== sFilter) return false;
      if (tFilter !== "all" && (i.tags || []).indexOf(tFilter) === -1) return false;
      if (!q) return true;
      var hay = [i.name, i.note].concat((i.params || []).map(function (p) { return p.k + p.v; })).join(" ").toLowerCase();
      var sx = seriesOf(i.series);
      if (sx) hay += " " + sx.name + " " + sx.en;
      (i.tags || []).forEach(function (t) { var tg = tagOf(t); if (tg) hay += " " + tg.label; });
      return hay.indexOf(q) !== -1;
    });
  }

  /* ---------- admin (lazy-loaded editor) ---------- */
  function renderAdmin() {
    railShown = false;
    $("seriesRail").classList.remove("show");
    var view = $("view");
    view.innerHTML = '<section class="page-head"><span class="eyebrow">Admin</span><h1>内容管理</h1><p class="page-desc">加载中…</p></section>';
    if (!window.LuthierAdmin) {
      var s = document.createElement("script");
      s.src = "js/admin.js?v=8";
      s.onload = function () { window.LuthierAdmin.mount(view, window.LuthierBridge); };
      s.onerror = function () {
        view.innerHTML = '<section><div class="empty"><h3>管理模块加载失败</h3><p>请确认 js/admin.js 文件存在。</p></div></section>';
      };
      document.head.appendChild(s);
    } else {
      window.LuthierAdmin.mount(view, window.LuthierBridge);
    }
  }

  /* ---------- reveal on scroll ---------- */
  var io = null;
  function observeReveals() {
    if (io) io.disconnect();
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- series rail ---------- */
  var railShown = false;
  function onScroll() {
    var show = window.scrollY > 260 && parseHash().name !== "admin";
    if (show !== railShown) { railShown = show; $("seriesRail").classList.toggle("show", show); }
  }
  function updateRail(r) {
    var chips = $("seriesRail").querySelectorAll("[data-series]");
    chips.forEach(function (c) {
      c.classList.toggle("active", r.name === "series" && c.dataset.series === r.id);
    });
    $("seriesRail").querySelector('[data-route="/"]').classList.toggle("active", r.name === "home");
    $("seriesRail").querySelector('[data-route="/favorites"]').classList.toggle("active", r.name === "favorites");
  }

  /* ---------- lightbox ---------- */
  function openLightbox(src, caption) {
    var lb = $("lightbox");
    $("lbImg").src = src;
    $("lbImg").alt = caption || "";
    $("lbCaption").textContent = caption || "";
    lb.hidden = false;
    requestAnimationFrame(function () { lb.classList.add("open"); });
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    var lb = $("lightbox");
    lb.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(function () { lb.hidden = true; }, 260);
  }

  /* ---------- share & copy ---------- */
  function pageUrl() { return location.origin + location.pathname; }
  function sharePage(title) {
    var url = pageUrl() + location.hash;
    var data = { title: title || document.title, text: title || document.title, url: url };
    if (navigator.share) {
      navigator.share(data).catch(function () {});
    } else {
      copyText(url, "链接已复制，去粘贴分享吧");
    }
  }
  function copyText(text, msg) {
    var done = function () { toast(msg); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---------- modal ---------- */
  function openModal(html) {
    $("modalBody").innerHTML = html;
    var m = $("modal");
    m.hidden = false;
    requestAnimationFrame(function () { m.classList.add("open"); });
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    var m = $("modal");
    m.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(function () { m.hidden = true; }, 280);
  }
  function saveToPhoneModal() {
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var steps = isIOS
      ? '<div class="save-step"><span class="step-num">1</span><p>打开 Safari 浏览器访问本页面</p></div>' +
        '<div class="save-step"><span class="step-num">2</span><p>点底部工具栏的 <b>分享</b> 按钮</p></div>' +
        '<div class="save-step"><span class="step-num">3</span><p>选择 <b>添加到主屏幕</b>，命名后点添加</p></div>'
      : '<div class="save-step"><span class="step-num">1</span><p>打开 Chrome / 系统浏览器访问本页面</p></div>' +
        '<div class="save-step"><span class="step-num">2</span><p>点右上角菜单 <b>⋮</b>（或底部菜单）</p></div>' +
        '<div class="save-step"><span class="step-num">3</span><p>选择 <b>添加到主屏幕 / 安装应用</b></p></div>';
    openModal("<h3>保存到手机</h3><p class='sub'>把展销会官网存到桌面，随时扫码查看。</p>" + steps);
  }

  /* ---------- global events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    // route links
    var routeEl = t.closest("[data-route]");
    if (routeEl) { var href = routeEl.getAttribute("data-route"); if (href === "/") location.hash = "#/"; else location.hash = "#" + href; return; }
    var sEl = t.closest("[data-series]");
    if (sEl) { location.hash = "#/series/" + sEl.getAttribute("data-series"); return; }
    // fav toggle (stop propagation handled below)
    var favEl = t.closest("[data-fav]");
    if (favEl) { e.stopPropagation(); e.preventDefault(); toggleFav(favEl.getAttribute("data-fav")); return; }
    // filter chips (series page)
    var fEl = t.closest("[data-filter]");
    if (fEl) {
      var r = parseHash();
      if (r.name === "series") {
        store.sset("series-tag-" + r.id, fEl.getAttribute("data-filter"));
        renderSeries(r.id);
      }
      return;
    }
    // search filter chips
    var sfEl = t.closest("[data-sf]");
    if (sfEl) { store.sset("search-series", sfEl.getAttribute("data-sf")); renderSearch(); return; }
    var tfEl = t.closest("[data-tf]");
    if (tfEl) { store.sset("search-tag", tfEl.getAttribute("data-tf")); renderSearch(); return; }
    // instrument card → detail
    var card = t.closest("[data-item]");
    if (card) { location.hash = "#/item/" + card.getAttribute("data-item"); }
  });

  document.addEventListener("keydown", function (e) {
    var card = e.target.closest && e.target.closest("[data-item]");
    if (card && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      location.hash = "#/item/" + card.getAttribute("data-item");
    }
    if (e.key === "Escape") { closeLightbox(); closeModal(); }
  });

  document.addEventListener("error", function (e) {
    var img = e.target;
    if (img && img.tagName === "IMG" && img.dataset.fallback && img.src !== img.dataset.fallback) {
      img.src = img.dataset.fallback;
      img.dataset.fallback = "";
    }
  }, true);

  // image fade-in on load
  document.addEventListener("load", function (e) {
    if (e.target && e.target.tagName === "IMG" && e.target.closest(".card-media, .detail-media")) {
      e.target.classList.add("loaded");
    }
  }, true);

  $("btnShare").addEventListener("click", function () { sharePage(); });
  $("btnSavePhone").addEventListener("click", saveToPhoneModal);
  $("btnQr").addEventListener("click", function () {
    window.open("qr.html?url=" + encodeURIComponent(pageUrl()), "_blank");
  });
  $("lbClose").addEventListener("click", closeLightbox);
  $("lightbox").addEventListener("click", function (e) { if (e.target.id === "lightbox") closeLightbox(); });
  $("modalClose").addEventListener("click", closeModal);
  $("modal").addEventListener("click", function (e) { if (e.target.id === "modal") closeModal(); });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("hashchange", route);

  /* ---------- boot ---------- */
  function fillStatic() {
    // brand text placeholders updated from data when loaded
  }
  function applyData() {
    $("brandName").textContent = DATA.site.brandName;
    $("footerBrand").textContent = DATA.site.brandName;
    $("footerEn").textContent = DATA.site.brandNameEn;
    $("footerWechat").textContent = DATA.contact.wechat;
    $("footerPhone").textContent = DATA.contact.phone;
    $("footerPhone").href = "tel:" + DATA.contact.phone.replace(/[^0-9]/g, "");
    $("footerNote").textContent = DATA.contact.wechatNote + " · " + DATA.contact.phoneNote;
    document.title = DATA.site.brandName + " · 手工提琴";
  }

  /* ---------- admin bridge ---------- */
  window.LuthierBridge = {
    getData: function () { return DATA; },
    saveData: function (d) {
      DATA = d;
      var ok = store.set("shixian.data.v1", JSON.stringify(d));
      applyData();
      if (parseHash().name !== "admin") route();
      return ok;
    },
    clearLocal: function () { store.set("shixian.data.v1", ""); },
    toast: toast,
    esc: esc
  };

  updateFavBadge();
  renderSkeleton();

  // Local admin-edited dataset wins when present (edited in this browser)
  var localData = store.get("shixian.data.v1");
  if (localData) {
    try {
      var parsed = JSON.parse(localData);
      if (parsed && parsed.site && Array.isArray(parsed.instruments)) {
        DATA = parsed;
        applyData();
        route();
        return;
      }
    } catch (e) { /* corrupted local data -> fall through to file */ }
  }

  fetch("data/instruments.json", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (d) {
      DATA = d;
      applyData();
      route();
    })
    .catch(function (err) {
      console.error("[luthier-site] data load failed:", err);
      renderError();
    });
})();
