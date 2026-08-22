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
    return '<span class="tag tag-' + esc(t.tone || "outline") + '">' + esc(ttagLabel(tid) || t.label) + "</span>";
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

  /* ---------- i18n (UI chrome only; instrument content stays source-language) ---------- */
  var LANGS = {
    zh: { home: "首页", series: "琴系列", fav: "我的收藏", search: "搜索琴款", back: "返回", detail: "详情", zoom: "点击放大", count: "共 {n} 款", found: "找到 {n} 款", all: "全部", empty: "没有找到琴款", emptyTip: "换个关键词或筛选条件试试。", favEmpty: "尚未收藏任何琴款", favEmptyTip: "浏览琴款时点击图片右上角的心形即可收藏。", browseAll: "浏览全部琴款", contact: "联系方式", wechat: "微信", phone: "电话", share: "分享", savePhone: "保存到手机", qr: "展销会二维码", expoTrial: "现场试奏", violin: "小提琴", cello: "大提琴", bass: "低音提琴", addWechat: "加微信咨询", call: "拨打电话", lang: "语言" },
    en: { home: "Home", series: "Collection", fav: "Favorites", search: "Search", back: "Back", detail: "Details", zoom: "Tap to zoom", count: "{n} items", found: "{n} found", all: "All", empty: "No instruments found", emptyTip: "Try another keyword or filter.", favEmpty: "No favorites yet", favEmptyTip: "Tap the heart on an image to save it.", browseAll: "Browse all", contact: "Contact", wechat: "WeChat", phone: "Phone", share: "Share", savePhone: "Save to phone", qr: "Expo QR", expoTrial: "Try on site", violin: "Violin", cello: "Cello", bass: "Double Bass", addWechat: "Chat on WeChat", call: "Call", lang: "Language" },
    ja: { home: "ホーム", series: "コレクション", fav: "お気に入り", search: "検索", back: "戻る", detail: "詳細", zoom: "タップで拡大", count: "{n} 点", found: "{n} 件", all: "すべて", empty: "楽器が見つかりません", emptyTip: "キーワードや条件を変えてみてください。", favEmpty: "お気に入りはまだありません", favEmptyTip: "画像のハートをタップして保存します。", browseAll: "すべて見る", contact: "連絡先", wechat: "WeChat", phone: "電話", share: "共有", savePhone: "ホーム画面に保存", qr: "展示会QR", expoTrial: "試奏可", violin: "バイオリン", cello: "チェロ", bass: "コントラバス", addWechat: "WeChatで相談", call: "電話", lang: "言語" },
    ko: { home: "홈", series: "컬렉션", fav: "즐겨찾기", search: "검색", back: "뒤로", detail: "상세", zoom: "탭하여 확대", count: "{n}개", found: "{n}건", all: "전체", empty: "악기를 찾을 수 없습니다", emptyTip: "다른 검색어나 조건을 사용해 보세요.", favEmpty: "즐겨찾기가 없습니다", favEmptyTip: "이미지의 하트를 눌러 저장하세요.", browseAll: "전체 보기", contact: "연락처", wechat: "위챗", phone: "전화", share: "공유", savePhone: "홈 화면에 저장", qr: "전시회 QR", expoTrial: "시주 가능", violin: "바이올린", cello: "첼로", bass: "콘트라베이스", addWechat: "위챗 상담", call: "전화", lang: "언어" },
    es: { home: "Inicio", series: "Colección", fav: "Favoritos", search: "Buscar", back: "Atrás", detail: "Detalles", zoom: "Toca para ampliar", count: "{n} artículos", found: "{n} encontrados", all: "Todos", empty: "No se encontraron instrumentos", emptyTip: "Prueba otra palabra o filtro.", favEmpty: "Sin favoritos aún", favEmptyTip: "Toca el corazón en la imagen para guardar.", browseAll: "Ver todos", contact: "Contacto", wechat: "WeChat", phone: "Teléfono", share: "Compartir", savePhone: "Guardar en el móvil", qr: "QR de la feria", expoTrial: "Prueba en vivo", violin: "Violín", cello: "Violonchelo", bass: "Contrabajo", addWechat: "Chatear en WeChat", call: "Llamar", lang: "Idioma" },
    fr: { home: "Accueil", series: "Collection", fav: "Favoris", search: "Rechercher", back: "Retour", detail: "Détails", zoom: "Toucher pour zoomer", count: "{n} articles", found: "{n} trouvés", all: "Tous", empty: "Aucun instrument trouvé", emptyTip: "Essayez un autre mot-clé ou filtre.", favEmpty: "Aucun favori", favEmptyTip: "Touchez le cœur sur l'image pour enregistrer.", browseAll: "Tout voir", contact: "Contact", wechat: "WeChat", phone: "Téléphone", share: "Partager", savePhone: "Enregistrer sur le téléphone", qr: "QR du salon", expoTrial: "Essai sur place", violin: "Violon", cello: "Violoncelle", bass: "Contrebasse", addWechat: "Discuter sur WeChat", call: "Appeler", lang: "Langue" },
    de: { home: "Start", series: "Sammlung", fav: "Favoriten", search: "Suchen", back: "Zurück", detail: "Details", zoom: "Zum Vergrößern tippen", count: "{n} Artikel", found: "{n} gefunden", all: "Alle", empty: "Keine Instrumente gefunden", emptyTip: "Anderes Stichwort oder Filter versuchen.", favEmpty: "Noch keine Favoriten", favEmptyTip: "Herz auf dem Bild antippen zum Speichern.", browseAll: "Alle ansehen", contact: "Kontakt", wechat: "WeChat", phone: "Telefon", share: "Teilen", savePhone: "Aufs Handy speichern", qr: "Messe QR", expoTrial: "Vor Ort testen", violin: "Violine", cello: "Cello", bass: "Kontrabass", addWechat: "WeChat-Chat", call: "Anrufen", lang: "Sprache" },
    ru: { home: "Главная", series: "Коллекция", fav: "Избранное", search: "Поиск", back: "Назад", detail: "Подробнее", zoom: "Нажмите, чтобы увеличить", count: "{n} шт.", found: "Найдено: {n}", all: "Все", empty: "Инструменты не найдены", emptyTip: "Попробуйте другое слово или фильтр.", favEmpty: "Избранного пока нет", favEmptyTip: "Нажмите сердце на изображении, чтобы сохранить.", browseAll: "Смотреть все", contact: "Контакты", wechat: "WeChat", phone: "Телефон", share: "Поделиться", savePhone: "Сохранить на телефон", qr: "QR ярмарки", expoTrial: "Проба на месте", violin: "Скрипка", cello: "Виолончель", bass: "Контрабас", addWechat: "Написать в WeChat", call: "Позвонить", lang: "Язык" }
  };
  var curLang = (function () { try { return localStorage.getItem("kaiyue.lang") || "zh"; } catch (e) { return "zh"; } })();
  var LANG_LABELS = { zh: "中文", en: "English", ja: "日本語", ko: "한국어", es: "Español", fr: "Français", de: "Deutsch", ru: "Русский" };
  function t(key, vars) {
    var d = LANGS[curLang] || LANGS.zh;
    var s = d[key] != null ? d[key] : (LANGS.zh[key] != null ? LANGS.zh[key] : key);
    if (vars) for (var k in vars) s = s.split("{" + k + "}").join(vars[k]);
    return s;
  }
  function setLang(l) { curLang = l; try { localStorage.setItem("kaiyue.lang", l); } catch (e) {} if (DATA) applyData(); route(); }
  function sName(sx) { return curLang === "zh" ? sx.name : (t(sx.id) === sx.id ? sx.name : t(sx.id)); }
  function imgsOf(i) { return (i.images && i.images.length) ? i.images : (i.image ? [i.image] : ["assets/img/violin.svg"]); }
  /* translated content from data.i18n (falls back to original Chinese) */
  function tc(field, sid) {
    if (!DATA || !DATA.i18n) return "";
    var d = DATA.i18n[curLang];
    if (!d) return "";
    return sid ? ((d.seriesDesc && d.seriesDesc[sid]) || "") : (d[field] || "");
  }
  /* translated instrument content (name/params/note) + tag labels + brand */
  function tin(id, field) {
    if (curLang === "zh" || !DATA || !DATA.i18nItems || !DATA.i18nItems[id]) return "";
    var d = DATA.i18nItems[id][curLang];
    return (d && d[field]) || "";
  }
  function tparams(id) {
    if (curLang === "zh" || !DATA || !DATA.i18nItems || !DATA.i18nItems[id]) return null;
    var d = DATA.i18nItems[id][curLang];
    return (d && d.params && d.params.length) ? d.params : null;
  }
  function ttagLabel(tid) {
    if (curLang === "zh" || !DATA || !DATA.i18nTags || !DATA.i18nTags[curLang]) return "";
    return DATA.i18nTags[curLang][tid] || "";
  }
  function brandName() { return (curLang === "zh" || !DATA.site.brandNameEn) ? DATA.site.brandName : DATA.site.brandNameEn; }

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
        '<span><h2>' + esc(sName(sx)) + '</h2><p class="en">' + esc(sx.en) + "</p></span>" +
        '<span class="series-desc">' + esc(tc("", sx.id) || sx.description) + "</span>" +
        '<span class="series-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5l7 7-7 7"/></svg></span></a>';
    }).join("");

    $("view").innerHTML =
      '<section class="hero">' +
        '<div class="hero-ornament" aria-hidden="true"><img src="assets/img/violin.svg" alt=""></div>' +
        '<div class="hero-ornament second" aria-hidden="true"><img src="assets/img/cello.svg" alt=""></div>' +
        '<p class="eyebrow reveal">' + esc(s.brandNameEn) + "</p>" +
        '<h1 class="reveal">' + esc(brandName()) + "</h1>" +
        '<p class="hero-tagline reveal">' + esc(tc("tagline") || s.tagline) + "</p>" +
        '<p class="hero-en reveal">' + esc(s.brandNameEn) + " · EST. MMXXVI</p>" +
        '<div class="gold-rule reveal"><span class="diamond"></span></div>' +
        '<div class="expo reveal">' +
          '<div class="expo-head"><span class="expo-title">' + esc(tc("expoTitle") || s.expo.title) + '</span><span class="expo-badge">' + t("expoTrial") + "</span></div>" +
          '<div class="expo-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg><span>' + esc((tc("expoDates") || s.expo.dates) + " · " + (tc("expoVenue") || s.expo.venue)) + "</span></div>" +
          '<p class="expo-note">' + esc(tc("expoNote") || s.expo.note) + "</p>" +
        "</div>" +
      "</section>" +
      '<section class="series-index"><p class="series-index-title">' + t("series") + "</p>" + seriesRows + "</section>";
    observeReveals();
  }

  /* ---------- instrument card ---------- */
  function cardHtml(i, opts) {
    opts = opts || {};
    var sx = seriesOf(i.series);
    var imgs = imgsOf(i);
    var ps = tparams(i.id) || (i.params || []).map(function (p) { return [p.k, p.v]; });
    var name = tin(i.id, "name") || i.name;
    var specs = ps.slice(0, 2).map(function (p) { return p[0] + "：" + p[1]; }).join(" · ");
    return '<article class="instrument-card reveal" data-item="' + esc(i.id) + '" role="button" tabindex="0" aria-label="查看 ' + esc(name) + '">' +
      '<div class="card-media">' +
        '<img src="' + esc(imgs[0]) + '" alt="' + esc(name) + '" loading="lazy" decoding="async" data-fallback="' + esc(imgs[1] || imgs[0]) + '">' +
        '<button class="fav-btn' + (isFav(i.id) ? " on" : "") + '" data-fav="' + esc(i.id) + '" aria-label="收藏" aria-pressed="' + isFav(i.id) + '">' + favSvg + "</button>" +
        '<span class="zoom-hint">点击放大</span>' +
      "</div>" +
      '<div class="card-body">' +
        '<h3 class="card-name">' + esc(name) + "</h3>" +
        '<div class="chip-row">' + (i.tags || []).map(tagHtml).join("") + "</div>" +
        '<p class="card-specs">' + esc(specs) + "</p>" +
        '<div class="card-foot">' + priceHtml(i) + '<span class="card-more">详情</span></div>' +
      "</div></article>";
  }

  function gridHtml(items) {
    if (!items.length) {
      return '<div class="empty"><h3>' + t("empty") + '</h3><p>' + t("emptyTip") + "</p></div>";
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
    var chips = '<button class="filter-chip' + (activeTag === "all" ? " active" : "") + '" data-filter="all">' + t("all") + "</button>" +
      tagIds.map(function (t) {
        var tag = tagOf(t);
        return '<button class="filter-chip' + (activeTag === t ? " active" : "") + '" data-filter="' + esc(t) + '">' + esc(tag ? tag.label : t) + "</button>";
      }).join("");

    $("view").innerHTML =
      '<section class="page-head">' +
        '<div class="back-row"><a class="back-pill" href="#/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>' + t("back") + "</a></div>" +
        '<span class="eyebrow">' + esc(sx.en) + " · " + t("series") + "</span>" +
        "<h1>" + esc(sName(sx)) + "</h1>" +
        '<p class="page-desc">' + esc(tc("", id) || sx.description) + "</p>" +
        '<div class="chip-row" style="margin-top:18px">' + chips + "</div>" +
        '<p class="result-count">' + t("count", { n: filtered.length }) + "</p>" +
      "</section>" +
      "<section>" + gridHtml(filtered) + "</section>";
    observeReveals();
  }

  /* ---------- detail ---------- */
  function renderDetail(id) {
    var i = itemOf(id);
    if (!i) { location.hash = "#/"; return; }
    var sx = seriesOf(i.series);
    var imgs = imgsOf(i);
    var dname = tin(i.id, "name") || i.name;
    var dnote = tin(i.id, "note") || i.note;
    var dps = tparams(i.id) || (i.params || []).map(function (p) { return [p.k, p.v]; });
    document.title = dname + " · " + brandName();
    var params = dps.map(function (p) {
      return '<div class="param-row"><dt>' + esc(p[0]) + "</dt><dd>" + esc(p[1]) + "</dd></div>";
    }).join("");

    $("view").innerHTML =
      '<section class="detail">' +
        '<div class="detail-head">' +
          '<a class="back-link" href="#/series/' + esc(i.series) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 5l-7 7 7 7"/></svg>' + t("back") + " " + esc(sx ? sName(sx) : "") + "</a>" +
        "</div>" +
        '<div class="detail-media reveal">' +
          '<div class="carousel">' +
            '<div class="carousel-track">' + imgs.map(function (src, j) {
              return '<img src="' + esc(src) + '" alt="' + esc(dname) + " " + (j + 1) + '" loading="lazy" decoding="async" data-full="' + esc(src) + '">';
            }).join("") + "</div>" +
            (imgs.length > 1
              ? '<button class="carousel-arrow prev" data-car-prev aria-label="prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 5l-7 7 7 7"/></svg></button>' +
                '<button class="carousel-arrow next" data-car-next aria-label="next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5l7 7-7 7"/></svg></button>' +
                '<div class="carousel-dots" id="carDots"></div>'
              : "") +
            '<span class="zoom-hint">' + t("zoom") + "</span>" +
          "</div>" +
          '<button class="fav-btn' + (isFav(i.id) ? " on" : "") + '" data-fav="' + esc(i.id) + '" aria-label="收藏" aria-pressed="' + isFav(i.id) + '">' + favSvg + "</button>" +
        "</div>" +
        '<div class="detail-title reveal">' +
          '<h1>' + esc(dname) + "</h1>" +
          '<p class="detail-series">' + esc(sx ? sx.en : "") + " · " + esc(sx ? sName(sx) : "") + "</p>" +
          '<div class="chip-row detail-tags">' + (i.tags || []).map(tagHtml).join("") + "</div>" +
          '<div class="detail-price">' + priceHtml(i) + "</div>" +
          (i.note ? '<p class="detail-note">' + esc(dnote) + "</p>" : "") +
        "</div>" +
        '<div class="param-table reveal">' + params + "</div>" +
        '<div class="detail-actions reveal">' +
          '<button class="btn btn-solid" id="dContactWechat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8.5 5C4.9 5 2 7.4 2 10.4c0 1.7.9 3.2 2.4 4.2L3.8 17l2.6-1.3c.7.2 1.4.3 2.1.3h.4"/><path d="M14 9.6c3.5 0 6.3 2.2 6.3 5 0 1.6-.9 3-2.2 4l.7 2.4-3.1-1.5a7.6 7.6 0 0 1-1.7.2c-3.5 0-6.3-2.2-6.3-5s2.8-5 6.3-5z"/></svg>' + t("addWechat") + "</button>" +
          '<div class="btn-row">' +
            '<a class="btn btn-outline" href="tel:' + esc(String(DATA.contact.phone).replace(/[^0-9]/g, "")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>' + t("call") + "</a>" +
            '<button class="btn btn-outline" id="dShare"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="12" r="2.6"/><circle cx="17.5" cy="5.5" r="2.6"/><circle cx="17.5" cy="18.5" r="2.6"/><path d="m8.4 10.8 6.8-4m-6.8 6.4 6.8 4"/></svg>' + t("share") + "</button>" +
          "</div>" +
        "</div>" +
      "</section>";

    $("dContactWechat").addEventListener("click", function () {
      copyText(DATA.contact.wechat, "微信号已复制：" + DATA.contact.wechat);
    });
    $("dShare").addEventListener("click", function () { sharePage(i.name); });
    initCarousel(i.name);
    observeReveals();
  }

  /* ---------- favorites ---------- */
  function renderFavorites() {
    document.title = "我的收藏 · " + DATA.site.brandName;
    var items = favs.map(itemOf).filter(Boolean);
    $("view").innerHTML =
      '<section class="page-head"><span class="eyebrow">Favorites</span><h1>' + t("fav") + "</h1>" +
      '<p class="page-desc">' + t("favEmptyTip") + "</p></section><section>" +
      (items.length
        ? gridHtml(items)
        : '<div class="empty"><div class="empty-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 20s-7.5-4.6-9.5-9C1 7.5 3.4 5 6.2 5c1.9 0 3.6 1 4.6 2.6h2.4C14.2 6 15.9 5 17.8 5 20.6 5 23 7.5 21.5 11c-2 4.4-9.5 9-9.5 9z"/></svg></div>' +
          "<h3>" + t("favEmpty") + "</h3><p>" + t("favEmptyTip") + "</p>" +
          '<a class="btn btn-solid" href="#/">' + t("browseAll") + "</a></div>") +
      "</section>";
    observeReveals();
  }

  /* ---------- search ---------- */
  function renderSearch() {
    document.title = "搜索 · " + DATA.site.brandName;
    var q = store.sget("search-q") || "";
    var sFilter = store.sget("search-series") || "all";
    var tFilter = store.sget("search-tag") || "all";
    var seriesChips = '<button class="filter-chip' + (sFilter === "all" ? " active" : "") + '" data-sf="all">' + t("all") + "</button>" +
      DATA.series.map(function (s) {
        return '<button class="filter-chip' + (sFilter === s.id ? " active" : "") + '" data-sf="' + esc(s.id) + '">' + esc(s.name) + "</button>";
      }).join("");
    var tagChips = '<button class="filter-chip' + (tFilter === "all" ? " active" : "") + '" data-tf="all">' + t("all") + "</button>" +
      DATA.tags.map(function (t) {
        return '<button class="filter-chip' + (tFilter === t.id ? " active" : "") + '" data-tf="' + esc(t.id) + '">' + esc(t.label) + "</button>";
      }).join("");

    var results = filterItems(q, sFilter, tFilter);
    $("view").innerHTML =
      '<section class="page-head">' +
        '<span class="eyebrow">Search</span><h1>' + t("search") + "</h1>" +
        '<div class="search-box" style="margin-top:20px">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
          '<input id="searchInput" type="search" placeholder="输入琴名、用材、系列…" value="' + esc(q) + '">' +
        "</div>" +
        '<div class="chip-row" style="margin-top:16px">' + seriesChips + "</div>" +
        '<div class="chip-row" style="margin-top:10px">' + tagChips + "</div>" +
        '<p class="result-count">' + t("found", { n: results.length }) + "</p>" +
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
      s.src = "js/admin.js?v=11";
      s.onload = function () { window.LuthierAdmin.mount(view, window.LuthierBridge); };
      s.onerror = function () {
        view.innerHTML = '<section><div class="empty"><h3>管理模块加载失败</h3><p>请确认 js/admin.js 文件存在。</p></div></section>';
      };
      document.head.appendChild(s);
    } else {
      window.LuthierAdmin.mount(view, window.LuthierBridge);
    }
  }

  /* ---------- carousel (native scroll-snap; swipe is free) ---------- */
  function initCarousel(name) {
    var track = document.querySelector(".detail-media .carousel-track");
    if (!track) return;
    var trackImgs = Array.prototype.slice.call(track.querySelectorAll("img"));
    var dotsBox = document.getElementById("carDots");
    var idx = 0;
    function sync() {
      if (!trackImgs.length) return;
      idx = Math.min(Math.max(Math.round(track.scrollLeft / (track.clientWidth || 1)), 0), trackImgs.length - 1);
      if (dotsBox) Array.prototype.forEach.call(dotsBox.children, function (d, j) { d.classList.toggle("on", j === idx); });
    }
    if (dotsBox) {
      trackImgs.forEach(function (_, j) {
        var d = document.createElement("button");
        d.className = "carousel-dot" + (j === 0 ? " on" : "");
        d.setAttribute("aria-label", String(j + 1));
        d.addEventListener("click", function () { track.scrollTo({ left: j * track.clientWidth, behavior: "smooth" }); });
        dotsBox.appendChild(d);
      });
      track.addEventListener("scroll", sync, { passive: true });
    }
    var prev = document.querySelector("[data-car-prev]"), next = document.querySelector("[data-car-next]");
    if (prev) prev.addEventListener("click", function () { track.scrollBy({ left: -track.clientWidth, behavior: "smooth" }); });
    if (next) next.addEventListener("click", function () { track.scrollBy({ left: track.clientWidth, behavior: "smooth" }); });
    trackImgs.forEach(function (im) {
      im.addEventListener("click", function () { sync(); openLightbox(im.getAttribute("data-full") || im.src, name); });
    });
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
    $("brandName").textContent = brandName();
    $("footerBrand").textContent = brandName();
    $("footerEn").textContent = DATA.site.brandNameEn;
    $("footerWechat").textContent = DATA.contact.wechat;
    $("footerPhone").textContent = DATA.contact.phone;
    $("footerPhone").href = "tel:" + DATA.contact.phone.replace(/[^0-9]/g, "");
    $("footerNote").textContent = DATA.contact.wechatNote + " · " + DATA.contact.phoneNote;
    document.title = brandName() + " · " + (curLang === "zh" ? "手工提琴" : "String Instruments");
    // language select + translated chrome
    var langSel = $("langSel");
    if (langSel) {
      if (!langSel.options.length) {
        langSel.innerHTML = Object.keys(LANGS).map(function (l) { return '<option value="' + l + '">' + (LANG_LABELS[l] || l) + "</option>"; }).join("");
      }
      langSel.value = curLang;
      langSel.onchange = function () { setLang(langSel.value); };
    }
    var rh = $("railHome"); if (rh) rh.textContent = t("home");
    var rf = $("railFav"); if (rf) rf.textContent = t("fav");
    var fl = $("footerContactLabel"); if (fl) fl.textContent = t("contact");
    var lbls = document.querySelectorAll(".footer-actions [data-lbl]");
    Array.prototype.forEach.call(lbls, function (el) {
      el.textContent = t(el.getAttribute("data-lbl"));
    });
    var tb = document.querySelector(".top-admin");
    if (tb) tb.textContent = t("admin") !== "admin" ? t("admin") : "管理";
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
