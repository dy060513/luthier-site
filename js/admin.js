/* ============================================================
   拾弦提琴工坊 · 内容管理后台（浏览器内编辑）
   - 编辑：站点信息 / 系列 / 标签 / 琴款（增删改）
   - 保存：本机 localStorage 立即生效；本地 server.js 托管时同步写回
     data/instruments.json；静态托管请用「导出 JSON」替换部署。
   - 口令：默认 luthier2026（客户端保护，防误入，非真正安全）
   ============================================================ */
(function () {
  "use strict";

  var PASSCODE = "luthier2026"; // 修改口令改这里

  var container = null;
  var bridge = null;
  var work = null;      // working copy of the dataset
  var tab = "site";     // site | series | tags | instruments
  var editing = -1;     // instrument index being edited (-1 = list mode)

  function $(sel) { return container.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(container.querySelectorAll(sel)); }
  function esc(s) { return bridge.esc(s); }
  function toast(m) { bridge.toast(m); }

  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function srem(k) { try { sessionStorage.removeItem(k); } catch (e) {} }

  /* ---------- image paste / pick → compressed data URL ---------- */
  function imageToDataUrl(file, maxW, maxH, quality, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var im = new Image();
      im.onload = function () {
        var sc = Math.min(1, maxW / im.width, maxH / im.height);
        var w = Math.max(1, Math.round(im.width * sc));
        var h = Math.max(1, Math.round(im.height * sc));
        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(im, 0, 0, w, h);
        var url = c.toDataURL("image/jpeg", quality);
        cb(url, { w: w, h: h, kb: Math.round(url.length / 1024) });
      };
      im.onerror = function () { toast("图片解析失败，请换一张试试"); };
      im.src = reader.result;
    };
    reader.onerror = function () { toast("读取图片失败"); };
    reader.readAsDataURL(file);
  }

  /* ---------- mount ---------- */
  function mount(root, b) {
    container = root;
    bridge = b;
    if (sget("luthier.admin") === "1") enter();
    else gate();
  }

  /* ---------- passcode gate ---------- */
  function gate() {
    container.innerHTML =
      '<section class="page-head"><div class="back-row"><a class="back-pill" href="#/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>返回</a></div><span class="eyebrow">Admin</span><h1>内容管理</h1>' +
      '<p class="page-desc">输入管理口令进入编辑模式。</p></section>' +
      '<section><div class="admin-card">' +
      '<label class="admin-label">管理口令</label>' +
      '<input class="admin-input" id="adminPass" type="password" placeholder="请输入口令" autocomplete="off">' +
      '<p class="admin-hint">默认口令 luthier2026，可在 js/admin.js 顶部修改。<br>静态站点的口令仅防误入，非真正安全（源码可见）。</p>' +
      '<button class="btn btn-solid" id="adminGo" style="margin-top:14px">进入管理</button>' +
      "</div></section>";
    var pass = document.getElementById("adminPass");
    var go = function () {
      if (pass.value === PASSCODE) { sset("luthier.admin", "1"); enter(); }
      else toast("口令不正确");
    };
    document.getElementById("adminGo").addEventListener("click", go);
    pass.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    pass.focus();
  }

  /* ---------- shell ---------- */
  function enter() {
    work = JSON.parse(JSON.stringify(bridge.getData()));
    if (!work || !work.site) { toast("数据不可用"); return; }
    container.innerHTML =
      '<section class="page-head"><div class="back-row"><a class="back-pill" href="#/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>返回</a></div><span class="eyebrow">Admin</span><h1>内容管理</h1>' +
      '<p class="page-desc">修改后点「保存」。本机立即生效；本地 server.js 托管会同步写回 data/instruments.json；静态托管（Vercel / GitHub Pages）请用「导出 JSON」下载后替换部署。</p></section>' +
      '<section class="admin-toolbar">' +
        '<div class="admin-tabs" id="admTabs">' +
          '<button class="admin-tab" data-tab="site">站点信息</button>' +
          '<button class="admin-tab" data-tab="series">系列</button>' +
          '<button class="admin-tab" data-tab="tags">标签</button>' +
          '<button class="admin-tab" data-tab="instruments">琴款</button>' +
        "</div>" +
        '<div class="admin-actions">' +
          '<button class="btn btn-solid" id="admSave">保存</button>' +
          '<button class="btn btn-outline" id="admExport">导出 JSON</button>' +
          '<button class="btn btn-outline" id="admImport">导入 JSON</button>' +
          '<button class="btn btn-outline" id="admExit">退出</button>' +
        "</div>" +
        '<input type="file" id="admFile" accept=".json,application/json" hidden>' +
      "</section>" +
      '<section class="admin-body" id="admBody"></section>';

    $$(".admin-tab").forEach(function (b) {
      b.addEventListener("click", function () {
        tab = b.getAttribute("data-tab");
        editing = -1;
        $$(".admin-tab").forEach(function (x) { x.classList.toggle("active", x === b); });
        renderTab();
      });
    });
    document.getElementById("admSave").addEventListener("click", save);
    document.getElementById("admExport").addEventListener("click", exportJson);
    document.getElementById("admImport").addEventListener("click", function () { document.getElementById("admFile").click(); });
    document.getElementById("admFile").addEventListener("change", function (e) {
      importJson(e.target.files[0]);
      e.target.value = "";
    });
    document.getElementById("admExit").addEventListener("click", function () {
      srem("luthier.admin");
      location.hash = "#/";
    });
    renderTab();
  }

  /* ---------- tabs ---------- */
  function renderTab() {
    var body = document.getElementById("admBody");
    if (tab === "site") body.innerHTML = siteForm();
    else if (tab === "series") body.innerHTML = seriesList();
    else if (tab === "tags") body.innerHTML = tagsList();
    else {
      if (editing >= 0) body.innerHTML = instrumentForm(editing);
      else body.innerHTML = instrumentsList();
    }
    // bottom save bar — always visible so save is never missed
    var bar = document.createElement("div");
    bar.className = "admin-save-bottom";
    bar.innerHTML = '<button class="btn btn-solid" id="admSaveBottom">保存修改</button>' +
      '<p class="admin-hint">点「保存修改」后：本机立即生效；本地托管会同步写回 data/instruments.json（所有访客可见）。</p>';
    body.appendChild(bar);
    document.getElementById("admSaveBottom").addEventListener("click", save);
    wireTab();
  }

  function wireTab() {
    if (tab === "series") {
      var addS = document.getElementById("addSeries");
      if (addS) addS.addEventListener("click", function () {
        var id = "s-" + Date.now().toString(36);
        work.series.push({ id: id, name: "新系列", en: "New", order: work.series.length + 1, description: "", image: "" });
        renderTab();
        toast("已添加系列，填写信息后保存");
      });
      $$("[data-sdel]").forEach(function (b) {
        b.addEventListener("click", function () {
          work.series.splice(Number(b.getAttribute("data-sdel")), 1);
          renderTab();
        });
      });
    }
    if (tab === "tags") {
      var addT = document.getElementById("addTag");
      if (addT) addT.addEventListener("click", function () {
        work.tags.push({ id: "t-" + Date.now().toString(36), label: "新标签", tone: "outline" });
        renderTab();
      });
      $$("[data-tdel]").forEach(function (b) {
        b.addEventListener("click", function () {
          work.tags.splice(Number(b.getAttribute("data-tdel")), 1);
          renderTab();
        });
      });
    }
    if (tab === "instruments" && editing < 0) {
      var addI = document.getElementById("addInstrument");
      if (addI) addI.addEventListener("click", function () {
        work.instruments.push(blankInstrument());
        editing = work.instruments.length - 1;
        renderTab();
      });
      $$("[data-edit]").forEach(function (b) {
        b.addEventListener("click", function () { editing = Number(b.getAttribute("data-edit")); renderTab(); });
      });
      $$("[data-idel]").forEach(function (b) {
        b.addEventListener("click", function () {
          work.instruments.splice(Number(b.getAttribute("data-idel")), 1);
          renderTab();
        });
      });
    }
    if (tab === "instruments" && editing >= 0) {
      document.getElementById("instDone").addEventListener("click", function () {
        collectInstrumentForm(editing);
        editing = -1;
        renderTab();
      });
      document.getElementById("instCancel").addEventListener("click", function () { editing = -1; renderTab(); });
      // wire delete buttons on all existing param rows
      $$("#paramRows .param-row-admin .admin-del").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var row = btn.closest(".param-row-admin");
          if (row) row.remove();
        });
      });
      var addParam = document.getElementById("addParam");
      if (addParam) addParam.addEventListener("click", function () {
        var rows = document.getElementById("paramRows");
        var div = document.createElement("div");
        div.className = "param-row-admin";
        div.innerHTML = '<input class="admin-input" placeholder="参数名" data-pk>' +
          '<input class="admin-input" placeholder="内容" data-pv>' +
          '<button class="admin-del" type="button">删</button>';
        div.querySelector(".admin-del").addEventListener("click", function () { div.remove(); });
        rows.appendChild(div);
      });
      var imgBox = document.getElementById("instImages");
      var hint = document.getElementById("imgHint");
      function addImageRow(value) {
        if (!imgBox) return;
        var row = document.createElement("div");
        row.className = "img-row";
        row.innerHTML = '<img alt="预览" data-pv><input class="admin-input" data-path value="' + esc(value) + '">' +
          '<span class="img-order"><button type="button" data-up title="上移">&#8593;</button><button type="button" data-down title="下移">&#8595;</button><button type="button" data-del class="img-del">&#10005;</button></span>';
        var im = row.querySelector("img");
        var inp = row.querySelector("[data-path]");
        im.src = value || "assets/img/violin.svg";
        inp.addEventListener("input", function () { im.src = inp.value.trim() || "assets/img/violin.svg"; });
        row.querySelector("[data-up]").addEventListener("click", function () {
          if (row.previousElementSibling) imgBox.insertBefore(row, row.previousElementSibling);
        });
        row.querySelector("[data-down]").addEventListener("click", function () {
          if (row.nextElementSibling) imgBox.insertBefore(row.nextElementSibling, row);
        });
        row.querySelector("[data-del]").addEventListener("click", function () { row.remove(); });
        imgBox.appendChild(row);
        if (hint) hint.textContent = "共 " + imgBox.children.length + " 张图；用上下箭头调整顺序（即详情页滑动顺序）";
      }
      if (imgBox) {
        var cur = work.instruments[editing];
        var existing = (cur && cur.images && cur.images.length) ? cur.images : (cur && cur.image ? [cur.image] : []);
        existing.forEach(addImageRow);
        // paste zone + file picker (append)
        var drop = document.getElementById("imgDrop");
        if (drop) {
          drop.addEventListener("click", function () {
            var f = document.getElementById("instFile");
            if (f) f.click();
          });
          drop.addEventListener("paste", function (e) {
            var items = ((e.clipboardData || window.clipboardData) || {}).items || [];
            for (var i = 0; i < items.length; i++) {
              if (items[i].kind === "file" && /^image\//.test(items[i].type)) {
                e.preventDefault();
                processImageFile(items[i].getAsFile());
              }
            }
          });
          drop.addEventListener("keydown", function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === "v") {
              drop.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true }));
            }
          });
        }
        var fileInput = document.getElementById("instFile");
        if (fileInput) {
          fileInput.addEventListener("change", function (e) {
            var fs = e.target.files || [];
            for (var i = 0; i < fs.length; i++) processImageFile(fs[i]);
            e.target.value = "";
          });
        }
        function processImageFile(file) {
          imageToDataUrl(file, 1280, 1280, 0.8, function (dataUrl, info) {
            addImageRow(dataUrl);
            toast("已添加第 " + imgBox.children.length + " 张（" + info.w + "×" + info.h + "，" + info.kb + " KB）");
          });
        }
      }
    }
  }

  /* ---------- site form ---------- */
  function field(label, id, val, tag) {
    if (tag === "textarea") {
      return '<label class="admin-label">' + label + '</label><textarea class="admin-input" id="' + id + '">' + esc(val == null ? "" : val) + "</textarea>";
    }
    return '<label class="admin-label">' + label + '</label><input class="admin-input" id="' + id + '" type="text" value="' + esc(val == null ? "" : val) + '">';
  }
  function siteForm() {
    var s = work.site, c = work.contact;
    return '<div class="admin-card">' +
      field("品牌名", "f-brandName", s.brandName) +
      field("英文名", "f-brandNameEn", s.brandNameEn) +
      field("品牌理念（一句话）", "f-tagline", s.tagline) +
      '<h4 class="admin-sec">展销会信息</h4>' +
      field("展会标题", "f-expoTitle", s.expo.title) +
      field("日期", "f-expoDates", s.expo.dates) +
      field("地点 / 展位", "f-expoVenue", s.expo.venue) +
      field("现场备注", "f-expoNote", s.expo.note, "textarea") +
      '<h4 class="admin-sec">联系方式</h4>' +
      field("微信号", "f-wechat", c.wechat) +
      field("微信备注", "f-wechatNote", c.wechatNote) +
      field("电话", "f-phone", c.phone) +
      field("电话备注", "f-phoneNote", c.phoneNote) +
      "</div>";
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  function collectSite() {
    work.site.brandName = val("f-brandName");
    work.site.brandNameEn = val("f-brandNameEn");
    work.site.tagline = val("f-tagline");
    work.site.expo.title = val("f-expoTitle");
    work.site.expo.dates = val("f-expoDates");
    work.site.expo.venue = val("f-expoVenue");
    work.site.expo.note = val("f-expoNote");
    work.contact.wechat = val("f-wechat");
    work.contact.wechatNote = val("f-wechatNote");
    work.contact.phone = val("f-phone");
    work.contact.phoneNote = val("f-phoneNote");
  }

  /* ---------- series ---------- */
  function seriesList() {
    return work.series.map(function (s, i) {
      return '<div class="admin-item">' +
        '<div class="admin-item-head"><span class="admin-item-title">' + esc(s.name) + " <em>" + esc(s.id) + "</em></span>" +
        '<button class="admin-del" data-sdel="' + i + '">删除系列</button></div>' +
        '<div class="admin-grid">' +
          field("名称", "series-name-" + i, s.name).replace('class="admin-label"', 'class="admin-label" style="margin-top:0"') +
          field("英文", "series-en-" + i, s.en).replace('class="admin-label"', 'class="admin-label" style="margin-top:0"') +
        "</div>" +
        field("描述（首页与系列页展示）", "series-desc-" + i, s.description, "textarea") +
        field("系列图片路径", "series-img-" + i, s.image) +
        "</div>";
    }).join("") +
      '<button class="btn btn-outline" id="addSeries" style="margin-top:4px">+ 新增系列</button>' +
      '<p class="admin-hint">提示：id 是路由标识（不要改）；order 为排序序号（本版未开放修改）。</p>';
  }
  function collectSeries() {
    work.series.forEach(function (s, i) {
      s.name = val("series-name-" + i);
      s.en = val("series-en-" + i);
      s.description = val("series-desc-" + i);
      s.image = val("series-img-" + i);
    });
  }

  /* ---------- tags ---------- */
  function tagsList() {
    var tones = ["gold", "wood", "ink", "outline"];
    return work.tags.map(function (t, i) {
      var opts = tones.map(function (x) {
        return '<option value="' + x + '"' + (t.tone === x ? " selected" : "") + ">" + x + "</option>";
      }).join("");
      return '<div class="admin-item">' +
        '<div class="admin-item-head"><span class="admin-item-title">' + esc(t.label) + " <em>" + esc(t.id) + "</em></span>" +
        '<button class="admin-del" data-tdel="' + i + '">删除标签</button></div>' +
        '<div class="admin-grid">' +
          '<div><label class="admin-label" style="margin-top:0">显示名</label><input class="admin-input" id="tag-label-' + i + '" value="' + esc(t.label) + '"></div>' +
          '<div><label class="admin-label" style="margin-top:0">配色</label><select class="admin-input" id="tag-tone-' + i + '">' + opts + "</select></div>" +
        "</div>" +
        "</div>";
    }).join("") +
      '<button class="btn btn-outline" id="addTag" style="margin-top:4px">+ 新增标签</button>' +
      '<p class="admin-hint">提示：删除标签不影响已有琴款，但琴款上已引用的旧标签会失效；请同步清理。</p>';
  }
  function collectTags() {
    work.tags.forEach(function (t, i) {
      t.label = val("tag-label-" + i);
      t.tone = val("tag-tone-" + i);
    });
  }

  /* ---------- instruments ---------- */
  function blankInstrument() {
    var first = work.series && work.series[0] ? work.series[0].id : "violin";
    return { id: "", series: first, name: "新琴款", image: "assets/img/violin.svg", tags: [], params: [], price: "面议", note: "" };
  }
  function instrumentsList() {
    var rows = work.instruments.map(function (i, idx) {
      var sx = null;
      work.series.forEach(function (s) { if (s.id === i.series) sx = s; });
      var seriesName = sx ? sx.name : i.series;
      return '<div class="admin-item">' +
        '<div class="admin-item-head"><span class="admin-item-title">' + esc(i.name) + " <em>" + esc(seriesName) + " · " + esc(i.id) + "</em></span>" +
        '<span><button class="admin-btn" data-edit="' + idx + '">编辑</button>' +
        '<button class="admin-del" data-idel="' + idx + '">删除</button></span></div>' +
        "</div>";
    }).join("") +
      '<button class="btn btn-outline" id="addInstrument" style="margin-top:4px">+ 新增琴款</button>' +
      '<p class="admin-hint">共 ' + work.instruments.length + " 把琴。点「编辑」改详情，改完点「完成」，最后点工具栏「保存」。</p>";
    return rows;
  }
  function instrumentForm(idx) {
    var i = work.instruments[idx];
    var seriesOpts = work.series.map(function (s) {
      return '<option value="' + esc(s.id) + '"' + (i.series === s.id ? " selected" : "") + ">" + esc(s.name) + "</option>";
    }).join("");
    var tagChecks = work.tags.map(function (t) {
      var on = (i.tags || []).indexOf(t.id) !== -1;
      return '<label class="tag-check"><input type="checkbox" data-tag="' + esc(t.id) + '"' + (on ? " checked" : "") + "> " + esc(t.label) + "</label>";
    }).join("");
    var paramRows = (i.params || []).map(function (p) {
      return '<div class="param-row-admin"><input class="admin-input" placeholder="参数名" value="' + esc(p.k) + '" data-pk>' +
        '<input class="admin-input" placeholder="内容" value="' + esc(p.v) + '" data-pv>' +
        '<button class="admin-del" type="button">删</button></div>';
    }).join("");
    return '<div class="admin-card">' +
      '<div class="admin-item-head"><span class="admin-item-title">编辑琴款</span>' +
      '<span><button class="btn btn-solid" id="instDone" style="height:36px;border-radius:10px;padding:0 18px;font-size:13px">完成本款</button>' +
      '<button class="admin-btn" id="instCancel">取消</button></span></div>' +
      '<p class="admin-hint" style="margin-top:0">「完成本款」只是保存这一把琴的编辑；全部改完后，点页面最下方的「保存修改」才会真正发布。</p>' +
      '<div class="admin-grid">' +
        '<div><label class="admin-label" style="margin-top:0">琴款名称</label><input class="admin-input" id="instName" value="' + esc(i.name) + '"></div>' +
        '<div><label class="admin-label" style="margin-top:0">编号 id（唯一）</label><input class="admin-input" id="instId" value="' + esc(i.id) + '"></div>' +
      "</div>" +
      '<label class="admin-label">所属系列</label><select class="admin-input" id="instSeries">' + seriesOpts + "</select>" +
      '<label class="admin-label">图片（多张：粘贴 / 选文件 / 或填路径，逐张添加）</label>' +
      '<div class="img-drop" id="imgDrop" tabindex="0">' +
        '<p class="img-drop-hint">在此处 <b>Ctrl+V 粘贴图片</b>，或点击选择文件（可多张）<br><span>自动压缩为网页图；第一张为列表缩略图，详情页左右滑动浏览</span></p>' +
        '<input type="file" id="instFile" accept="image/*" multiple hidden>' +
      "</div>" +
      '<div class="img-rows" id="instImages"></div>' +
      '<p class="admin-hint" id="imgHint"></p>' +
      '<label class="admin-label">标签（可多选）</label><div class="tag-checks" id="instTags">' + tagChecks + "</div>" +
      '<label class="admin-label">价格（如 ¥28,000 或 面议）</label><input class="admin-input" id="instPrice" value="' + esc(i.price || "") + '">' +
      '<label class="admin-label">备注</label><input class="admin-input" id="instNote" value="' + esc(i.note || "") + '">' +
      '<label class="admin-label">参数（可增删）</label>' +
      '<div class="param-rows" id="paramRows">' + paramRows + "</div>" +
      '<button class="btn btn-outline" id="addParam" style="margin-top:6px">+ 添加参数</button>' +
      "</div>";
  }
  function collectInstrumentForm(idx) {
    var i = work.instruments[idx];
    if (!i) return;
    i.name = val("instName");
    i.id = val("instId");
    i.series = val("instSeries");
    i.image = "";
    i.price = val("instPrice");
    i.note = val("instNote");
    i.tags = [];
    $$("#instTags input:checked").forEach(function (c) { i.tags.push(c.getAttribute("data-tag")); });
    i.images = [];
    $$("#instImages .img-row [data-path]").forEach(function (inp) {
      var v = inp.value.trim();
      if (v) i.images.push(v);
    });
    i.image = i.images[0] || "";
    i.params = [];
    $$("#paramRows .param-row-admin").forEach(function (row) {
      var k = row.querySelector("[data-pk]").value.trim();
      var v = row.querySelector("[data-pv]").value.trim();
      if (k || v) i.params.push({ k: k || "参数", v: v });
    });
  }
  function collectInstruments() { /* list mode: edits already committed via editor */ }

  /* ---------- save / export / import / reset ---------- */
  function save() {
    try {
      if (tab === "site") collectSite();
      else if (tab === "series") collectSeries();
      else if (tab === "tags") collectTags();
      else {
        if (editing >= 0) collectInstrumentForm(editing);
        editing = -1;
      }
      var ok = bridge.saveData(work);
      renderTab();
      if (ok) toast("已保存（本机生效）");
      else toast("本机存储空间不足（图片过多过大）——请用「导出 JSON」部署，访客仍能看到新内容");
      serverSave();
    } catch (e) {
      toast("保存失败：" + e.message);
    }
  }
  function serverSave() {
    fetch("api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(work)
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("http")); })
      .then(function (j) {
        if (j && j.ok) toast("已同步写回 data/instruments.json（所有访客可见）");
      })
      .catch(function () {
        toast("静态托管环境：请点「导出 JSON」下载后替换部署");
      });
  }
  function exportJson() {
    var blob = new Blob([JSON.stringify(work, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "instruments.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    toast("已导出 instruments.json");
  }
  function importJson(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var d = JSON.parse(reader.result);
        if (!d || !d.site || !Array.isArray(d.series) || !Array.isArray(d.instruments)) throw new Error("bad");
        work = d;
        renderTab();
        toast("已导入，点「保存」生效");
      } catch (e) {
        toast("导入失败：文件不是有效的 instruments.json");
      }
    };
    reader.readAsText(file);
  }

  window.LuthierAdmin = { mount: mount };
})();
