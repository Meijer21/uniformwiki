export const CONTRIBUTE_JS = `(function () {
  var form = document.getElementById("schrijf-form");
  if (!form) return;

  var title = document.getElementById("title");
  var slug = document.getElementById("slug");
  var locked = form.getAttribute("data-vast") === "1";
  var category = document.getElementById("category");
  var categoryNew = document.getElementById("category_new");
  var dienst = document.getElementById("dienst");
  var dienstNew = document.getElementById("dienst_new");
  var tagsValue = document.getElementById("tags");
  var tagPick = document.getElementById("tag-pick");
  var tagNew = document.getElementById("tag-new");
  var tagAdd = document.getElementById("tag-add");
  var body = document.getElementById("body");
  var editor = document.getElementById("body-editor");
  var mentionMenu = document.getElementById("mention-menu");
  var mentionDataEl = document.getElementById("mention-data");
  var bronList = document.getElementById("bron-list");
  var bronnen = document.getElementById("bronnen");
  var bronAdd = document.getElementById("bron-add");
  var jsOk = document.getElementById("js_ok");
  var formT = document.getElementById("form_t");
  var mentions = [];
  try {
    mentions = JSON.parse(mentionDataEl && mentionDataEl.textContent ? mentionDataEl.textContent : "[]");
  } catch (err) {
    mentions = [];
  }

  if (jsOk) jsOk.value = "1";
  if (formT && !formT.value) formT.value = String(Date.now());

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

  function syncNewField(select, wrap, input, focus) {
    if (!select || !wrap) return;
    var open = select.value === "__nieuw__";
    wrap.hidden = !open;
    wrap.classList.toggle("is-open", open);
    if (open && focus && input) input.focus();
  }

  if (category) {
    category.addEventListener("change", function () {
      syncNewField(category, document.getElementById("category-new-wrap"), categoryNew, true);
    });
    syncNewField(category, document.getElementById("category-new-wrap"), categoryNew, false);
  }
  if (dienst) {
    dienst.addEventListener("change", function () {
      syncNewField(dienst, document.getElementById("dienst-new-wrap"), dienstNew, true);
    });
    syncNewField(dienst, document.getElementById("dienst-new-wrap"), dienstNew, false);
  }

  function selectedTags() {
    var fromBoxes = [];
    if (tagPick) {
      tagPick.querySelectorAll('input[name="tag"]:checked').forEach(function (box) {
        fromBoxes.push(box.value);
      });
    }
    if (fromBoxes.length) return fromBoxes;
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
    var boxes = tagPick.querySelectorAll('input[name="tag"]');
    boxes.forEach(function (box) {
      box.checked = out.some(function (item) { return item.toLowerCase() === box.value.toLowerCase(); });
    });
    out.forEach(function (item) {
      var exists = false;
      boxes.forEach(function (box) {
        if (box.value.toLowerCase() === item.toLowerCase()) exists = true;
      });
      if (exists) return;
      var label = document.createElement("label");
      label.className = "chip-toggle";
      var safe = item.replace(/</g, "&lt;").replace(/"/g, "&quot;");
      label.innerHTML = '<input type="checkbox" name="tag" value="' + safe + '" checked /> <span>' + safe + " (wacht op keuring)</span>";
      tagPick.appendChild(label);
    });
  }

  function addNewTag() {
    if (!tagNew) return;
    var label = tagNew.value.trim();
    if (!label) return;
    setTags(selectedTags().concat([label]));
    tagNew.value = "";
    tagNew.focus();
  }
  if (tagAdd) tagAdd.addEventListener("click", function (event) {
    event.preventDefault();
    addNewTag();
  });
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
      bronAdd.addEventListener("click", function (event) {
        event.preventDefault();
        bronList.appendChild(bronRow("", ""));
        var inputs = bronList.querySelectorAll("[data-bron-naam]");
        inputs[inputs.length - 1].focus();
        syncBronnen();
      });
    }
    syncBronnen();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mentionHtml(title) {
    return '<span class="mention" data-title="' + escapeHtml(title) + '" contenteditable="false">' + escapeHtml(title) + "</span>";
  }

  function formatInline(text) {
    return String(text || "").split(/(@\\[[^\\]]+\\])/g).map(function (part) {
      var match = part.match(/^@\\[([^\\]]+)\\]$/);
      if (match) return mentionHtml(match[1]);
      return escapeHtml(part).replace(/\\n/g, "<br>");
    }).join("");
  }

  function wikiToHtml(src) {
    var lines = String(src || "").replace(/\\r\\n/g, "\\n").split("\\n");
    var html = [];
    var list = null;
    function flush() {
      if (!list) return;
      html.push(list === "ul" ? "</ul>" : "</ol>");
      list = null;
    }
    lines.forEach(function (line) {
      var ul = line.match(/^\\s*[-*]\\s+(.*)$/);
      var ol = line.match(/^\\s*\\d+\\.\\s+(.*)$/);
      var heading = line.match(/^#{1,3}\\s+(.*)$/);
      if (ul) {
        if (list !== "ul") { flush(); html.push("<ul>"); list = "ul"; }
        html.push("<li>" + formatInline(ul[1]) + "</li>");
        return;
      }
      if (ol) {
        if (list !== "ol") { flush(); html.push("<ol>"); list = "ol"; }
        html.push("<li>" + formatInline(ol[1]) + "</li>");
        return;
      }
      flush();
      if (heading) {
        html.push("<p><strong>" + formatInline(heading[1]) + "</strong></p>");
        return;
      }
      if (!line.trim()) {
        html.push("<p><br></p>");
        return;
      }
      html.push("<p>" + formatInline(line) + "</p>");
    });
    flush();
    return html.join("") || "<p><br></p>";
  }

  function nodeToWiki(node) {
    if (!node) return "";
    if (node.nodeType === 3) return node.nodeValue || "";
    if (node.nodeType !== 1) return "";
    var el = node;
    if (el.classList && el.classList.contains("mention")) {
      return "@[" + (el.getAttribute("data-title") || el.textContent || "").trim() + "]";
    }
    var tag = el.tagName;
    if (tag === "BR") return "\\n";
    var inner = "";
    for (var i = 0; i < el.childNodes.length; i += 1) {
      inner += nodeToWiki(el.childNodes[i]);
    }
    if (tag === "LI") {
      var parent = el.parentElement && el.parentElement.tagName === "OL" ? "1. " : "- ";
      return parent + inner.replace(/\\n+/g, " ").trim() + "\\n";
    }
    if (tag === "UL" || tag === "OL") return inner + "\\n";
    if (tag === "P" || tag === "DIV" || tag === "H1" || tag === "H2" || tag === "H3") {
      var text = inner.trim();
      return text ? text + "\\n\\n" : "";
    }
    return inner;
  }

  function htmlToWiki(root) {
    return nodeToWiki(root).replace(/[ \\t]+\\n/g, "\\n").replace(/\\n{3,}/g, "\\n\\n").trim();
  }

  function syncBody() {
    if (!body || !editor) return;
    body.value = htmlToWiki(editor);
  }

  function hideMentions() {
    if (!mentionMenu) return;
    mentionMenu.hidden = true;
    mentionMenu.innerHTML = "";
  }

  function caretQuery() {
    if (!editor) return null;
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    var range = sel.getRangeAt(0);
    if (!editor.contains(range.startContainer)) return null;
    var node = range.startContainer;
    if (node.nodeType !== 3) return null;
    var before = (node.nodeValue || "").slice(0, range.startOffset);
    var match = before.match(/@([^\\s@\\[]{0,40})$/);
    if (!match) return null;
    return { node: node, start: range.startOffset - match[0].length, end: range.startOffset, query: match[1].toLowerCase() };
  }

  function renderMentions(query) {
    if (!mentionMenu) return;
    var hits = mentions.filter(function (item) {
      return !query || String(item.label || "").toLowerCase().indexOf(query) !== -1;
    }).slice(0, 8);
    if (!hits.length) {
      mentionMenu.innerHTML = '<button type="button" class="mention-item" data-insert=""><span>Geen artikel gevonden</span><em>typ verder</em></button>';
      mentionMenu.hidden = false;
      return;
    }
    mentionMenu.innerHTML = hits.map(function (item, index) {
      return '<button type="button" class="mention-item' + (index === 0 ? " is-active" : "") + '" data-insert="' +
        escapeHtml(item.insert) + '" data-title="' + escapeHtml(item.label) + '"><span>' +
        escapeHtml(item.label) + "</span><em>artikel</em></button>";
    }).join("");
    mentionMenu.hidden = false;
  }

  function placeCaretAfter(el) {
    var range = document.createRange();
    range.setStartAfter(el);
    range.collapse(true);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function insertMention(title) {
    if (!editor || !title) return;
    editor.focus();
    var found = caretQuery();
    var span = document.createElement("span");
    span.className = "mention";
    span.setAttribute("contenteditable", "false");
    span.setAttribute("data-title", title);
    span.textContent = title;
    var space = document.createTextNode(" ");
    if (found) {
      var text = found.node.nodeValue || "";
      found.node.nodeValue = text.slice(0, found.start) + text.slice(found.end);
      var range = document.createRange();
      range.setStart(found.node, found.start);
      range.collapse(true);
      range.insertNode(space);
      range.insertNode(span);
    } else {
      editor.appendChild(span);
      editor.appendChild(space);
    }
    placeCaretAfter(space);
    hideMentions();
    syncBody();
  }

  function applyList(kind) {
    if (!editor) return;
    editor.focus();
    document.execCommand(kind === "ol" ? "insertOrderedList" : "insertUnorderedList", false, null);
    syncBody();
  }

  if (editor && body) {
    editor.innerHTML = wikiToHtml(body.value);
    syncBody();
    editor.addEventListener("input", function () {
      syncBody();
      var found = caretQuery();
      if (!found) {
        hideMentions();
        return;
      }
      renderMentions(found.query);
    });
    editor.addEventListener("keydown", function (event) {
      if (mentionMenu && !mentionMenu.hidden) {
        var active = mentionMenu.querySelector(".is-active") || mentionMenu.querySelector(".mention-item");
        if (event.key === "Escape") {
          event.preventDefault();
          hideMentions();
          return;
        }
        if (event.key === "Enter" && active) {
          event.preventDefault();
          insertMention(active.getAttribute("data-title") || "");
          return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          var items = Array.prototype.slice.call(mentionMenu.querySelectorAll(".mention-item"));
          var index = items.indexOf(mentionMenu.querySelector(".is-active"));
          var next = event.key === "ArrowDown" ? index + 1 : index - 1;
          if (next < 0) next = items.length - 1;
          if (next >= items.length) next = 0;
          items.forEach(function (item) { item.classList.remove("is-active"); });
          items[next].classList.add("is-active");
          return;
        }
      }
    });
    editor.addEventListener("paste", function (event) {
      event.preventDefault();
      var pasted = (event.clipboardData && event.clipboardData.getData("text/plain")) || "";
      pasted = pasted.replace(/<[^>]+>/g, " ").replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g, "$1");
      document.execCommand("insertText", false, pasted);
      syncBody();
    });
  }

  var btnUl = document.getElementById("fmt-ul");
  var btnOl = document.getElementById("fmt-ol");
  var btnAt = document.getElementById("fmt-at");
  if (btnUl) btnUl.addEventListener("click", function (event) { event.preventDefault(); applyList("ul"); });
  if (btnOl) btnOl.addEventListener("click", function (event) { event.preventDefault(); applyList("ol"); });
  if (btnAt) {
    btnAt.addEventListener("click", function (event) {
      event.preventDefault();
      if (!editor) return;
      editor.focus();
      document.execCommand("insertText", false, "@");
      renderMentions("");
    });
  }

  if (mentionMenu) {
    mentionMenu.addEventListener("mousedown", function (event) {
      var btn = event.target.closest("[data-title]");
      if (!btn) return;
      event.preventDefault();
      insertMention(btn.getAttribute("data-title") || "");
    });
    document.addEventListener("click", function (event) {
      if (!mentionMenu.contains(event.target) && event.target !== editor && event.target !== btnAt) hideMentions();
    });
  }

  form.addEventListener("submit", function (event) {
    var extra = tagNew && tagNew.value.trim() ? [tagNew.value.trim()] : [];
    setTags(selectedTags().concat(extra));
    syncBronnen();
    syncBody();
    if (body && !body.value.trim()) {
      event.preventDefault();
      if (editor) editor.focus();
    }
  });
})();
`;
