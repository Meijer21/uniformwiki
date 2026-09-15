export const CONTRIBUTE_JS = `(function () {
  var form = document.getElementById("schrijf-form");
  if (!form) return;

  var title = document.getElementById("title");
  var slug = document.getElementById("slug");
  var locked = form.getAttribute("data-vast") === "1";
  var category = document.getElementById("category");
  var categoryNewWrap = document.getElementById("category-new-wrap");
  var categoryNew = document.getElementById("category_new");
  var tagsValue = document.getElementById("tags");
  var tagPick = document.getElementById("tag-pick");
  var tagNew = document.getElementById("tag-new");
  var tagAdd = document.getElementById("tag-add");
  var body = document.getElementById("body");
  var mentionMenu = document.getElementById("mention-menu");
  var mentionDataEl = document.getElementById("mention-data");
  var bronList = document.getElementById("bron-list");
  var bronnen = document.getElementById("bronnen");
  var bronAdd = document.getElementById("bron-add");
  var mentions = [];
  try {
    mentions = JSON.parse(mentionDataEl && mentionDataEl.textContent ? mentionDataEl.textContent : "[]");
  } catch (err) {
    mentions = [];
  }

  function slugify(value) {
    var ascii = String(value || "")
      .normalize("NFKD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    return ascii || "artikel";
  }

  function syncSlug() {
    if (locked || !title || !slug) return;
    slug.value = slugify(title.value);
  }

  if (title) {
    title.addEventListener("input", syncSlug);
    if (!locked) syncSlug();
  }

  function toggleCategoryNew() {
    if (!category || !categoryNewWrap) return;
    var show = category.value === "__nieuw__";
    categoryNewWrap.hidden = !show;
    if (categoryNew) {
      categoryNew.required = show;
      if (show) categoryNew.focus();
    }
  }
  if (category) {
    category.addEventListener("change", toggleCategoryNew);
    toggleCategoryNew();
  }

  function selectedTags() {
    if (!tagsValue) return [];
    return tagsValue.value.split(",").map(function (part) { return part.trim(); }).filter(Boolean);
  }

  function setTags(list) {
    var seen = {};
    var out = [];
    list.forEach(function (item) {
      var key = item.toLowerCase();
      if (!item || seen[key]) return;
      seen[key] = true;
      out.push(item);
    });
    if (tagsValue) tagsValue.value = out.join(", ");
    if (!tagPick) return;
    var buttons = tagPick.querySelectorAll("[data-tag]");
    buttons.forEach(function (btn) {
      var label = btn.getAttribute("data-tag") || "";
      var on = out.some(function (item) { return item.toLowerCase() === label.toLowerCase(); });
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var extra = tagPick.querySelectorAll("[data-extra]");
    extra.forEach(function (node) { node.remove(); });
    out.forEach(function (item) {
      var exists = false;
      buttons.forEach(function (btn) {
        if ((btn.getAttribute("data-tag") || "").toLowerCase() === item.toLowerCase()) exists = true;
      });
      if (exists) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip-toggle is-on is-new";
      btn.setAttribute("data-tag", item);
      btn.setAttribute("data-extra", "1");
      btn.setAttribute("aria-pressed", "true");
      btn.textContent = item + " (wacht op keuring)";
      tagPick.appendChild(btn);
    });
  }

  if (tagPick) {
    tagPick.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-tag]");
      if (!btn) return;
      var label = btn.getAttribute("data-tag") || "";
      var current = selectedTags();
      var on = current.some(function (item) { return item.toLowerCase() === label.toLowerCase(); });
      if (on) {
        setTags(current.filter(function (item) { return item.toLowerCase() !== label.toLowerCase(); }));
      } else {
        setTags(current.concat([label]));
      }
    });
    setTags(selectedTags());
  }

  function addNewTag() {
    if (!tagNew) return;
    var label = tagNew.value.trim();
    if (!label) return;
    setTags(selectedTags().concat([label]));
    tagNew.value = "";
    tagNew.focus();
  }
  if (tagAdd) tagAdd.addEventListener("click", addNewTag);
  if (tagNew) {
    tagNew.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        addNewTag();
      }
    });
  }

  function bronRow(name, url) {
    var wrap = document.createElement("div");
    wrap.className = "bron-row";
    wrap.innerHTML =
      '<label class="field"><span class="field-label">Naam bron</span>' +
      '<input class="input" name="bron_naam" data-bron-naam value="' + String(name || "").replace(/"/g, "&quot;") + '" placeholder="Bijvoorbeeld NIPV"></label>' +
      '<label class="field"><span class="field-label">Link</span>' +
      '<input class="input" name="bron_url" data-bron-url type="url" inputmode="url" value="' + String(url || "").replace(/"/g, "&quot;") + '" placeholder="https://"></label>';
    return wrap;
  }

  function syncBronnen() {
    if (!bronList || !bronnen) return;
    var names = bronList.querySelectorAll("[data-bron-naam]");
    var urls = bronList.querySelectorAll("[data-bron-url]");
    var lines = [];
    for (var i = 0; i < names.length; i += 1) {
      var naam = (names[i].value || "").trim();
      var link = (urls[i] ? urls[i].value : "").trim();
      if (!naam && !link) continue;
      lines.push(link ? naam + " | " + link : naam);
    }
    bronnen.value = lines.join("\\n");
  }

  if (bronList) {
    if (!bronList.children.length) bronList.appendChild(bronRow("", ""));
    bronList.addEventListener("input", syncBronnen);
    if (bronAdd) {
      bronAdd.addEventListener("click", function () {
        bronList.appendChild(bronRow("", ""));
        var inputs = bronList.querySelectorAll("[data-bron-naam]");
        inputs[inputs.length - 1].focus();
      });
    }
    form.addEventListener("submit", syncBronnen);
    syncBronnen();
  }

  function prefixSelected(kind) {
    if (!body) return;
    var start = body.selectionStart;
    var end = body.selectionEnd;
    var value = body.value;
    var lineStart = value.lastIndexOf("\\n", start - 1) + 1;
    var chunk = value.slice(lineStart, end);
    var lines = chunk.split("\\n");
    var next = lines.map(function (line, index) {
      var clean = line.replace(/^\\s*[-*]\\s+/, "").replace(/^\\s*\\d+\\.\\s+/, "");
      if (kind === "ul") return "- " + clean;
      return (index + 1) + ". " + clean;
    }).join("\\n");
    body.value = value.slice(0, lineStart) + next + value.slice(end);
    body.focus();
  }

  var btnUl = document.getElementById("fmt-ul");
  var btnOl = document.getElementById("fmt-ol");
  var btnAt = document.getElementById("fmt-at");
  if (btnUl) btnUl.addEventListener("click", function () { prefixSelected("ul"); });
  if (btnOl) btnOl.addEventListener("click", function () { prefixSelected("ol"); });
  if (btnAt && body) {
    btnAt.addEventListener("click", function () {
      var start = body.selectionStart;
      body.value = body.value.slice(0, start) + "@" + body.value.slice(body.selectionEnd);
      body.setSelectionRange(start + 1, start + 1);
      body.focus();
      body.dispatchEvent(new Event("input"));
    });
  }

  if (body) {
    body.addEventListener("paste", function (event) {
      var pasted = event.clipboardData && event.clipboardData.getData("text/plain");
      if (!pasted) return;
      event.preventDefault();
      var start = body.selectionStart;
      var end = body.selectionEnd;
      var clean = pasted
        .replace(/<[^>]+>/g, " ")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
      body.value = body.value.slice(0, start) + clean + body.value.slice(end);
      var pos = start + clean.length;
      body.setSelectionRange(pos, pos);
    });
  }

  function hideMentions() {
    if (!mentionMenu) return;
    mentionMenu.hidden = true;
    mentionMenu.innerHTML = "";
  }

  function atQuery(textarea) {
    var start = textarea.selectionStart;
    var before = textarea.value.slice(0, start);
    var match = before.match(/(^|[\\s([{])@([^\\s@\\]]{0,40})$/);
    if (!match) return null;
    return { start: start - match[2].length - 1, query: match[2].replace(/^\\[/, "").toLowerCase() };
  }

  function renderMentions(query) {
    var hits = mentions.filter(function (item) {
      return !query || String(item.label || "").toLowerCase().indexOf(query) !== -1;
    }).slice(0, 8);
    if (!hits.length) {
      hideMentions();
      return;
    }
    mentionMenu.innerHTML = hits.map(function (item, index) {
      return '<button type="button" class="mention-item' + (index === 0 ? " is-active" : "") + '" data-insert="' +
        String(item.insert).replace(/"/g, "&quot;") + '"><span>' +
        String(item.label).replace(/</g, "&lt;") + '</span><em>artikel</em></button>';
    }).join("");
    mentionMenu.hidden = false;
  }

  function insertMention(text) {
    if (!body) return;
    var found = atQuery(body);
    if (!found) return;
    var value = body.value;
    var before = value.slice(0, found.start);
    var after = value.slice(body.selectionStart);
    var glue = before && !/\\s$/.test(before) ? " " : "";
    body.value = before + glue + text + " " + after;
    var pos = (before + glue + text + " ").length;
    body.setSelectionRange(pos, pos);
    body.focus();
    hideMentions();
  }

  if (body && mentionMenu) {
    body.addEventListener("input", function () {
      var found = atQuery(body);
      if (!found) {
        hideMentions();
        return;
      }
      renderMentions(found.query);
    });
    body.addEventListener("keydown", function (event) {
      if (mentionMenu.hidden) return;
      var active = mentionMenu.querySelector(".is-active");
      if (event.key === "Escape") {
        event.preventDefault();
        hideMentions();
        return;
      }
      if (event.key === "Enter" && active) {
        event.preventDefault();
        insertMention(active.getAttribute("data-insert") || "");
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        var items = Array.prototype.slice.call(mentionMenu.querySelectorAll(".mention-item"));
        var index = items.indexOf(active);
        var next = event.key === "ArrowDown" ? index + 1 : index - 1;
        if (next < 0) next = items.length - 1;
        if (next >= items.length) next = 0;
        items.forEach(function (item) { item.classList.remove("is-active"); });
        items[next].classList.add("is-active");
      }
    });
    mentionMenu.addEventListener("mousedown", function (event) {
      var btn = event.target.closest("[data-insert]");
      if (!btn) return;
      event.preventDefault();
      insertMention(btn.getAttribute("data-insert") || "");
    });
    document.addEventListener("click", function (event) {
      if (!mentionMenu.contains(event.target) && event.target !== body) hideMentions();
    });
  }
})();
`;
