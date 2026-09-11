export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/`([^`]+)`/g, '<code class="rounded bg-stone-200/80 px-1 py-0.5 text-[0.9em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a class="underline decoration-amber-700/50 underline-offset-2 hover:text-amber-900" href="$2" rel="noopener noreferrer">$1</a>',
    );
}

export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inCode = false;
  let code: string[] = [];
  let list: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = (): void => {
    if (list.length === 0 || !listType) {
      return;
    }
    const tag = listType;
    html.push(`<${tag} class="my-4 ml-5 list-outside ${tag === "ol" ? "list-decimal" : "list-disc"} space-y-1">`);
    for (const item of list) {
      html.push(`<li>${formatInline(item)}</li>`);
    }
    html.push(`</${tag}>`);
    list = [];
    listType = null;
  };

  const flushCode = (): void => {
    if (!inCode) {
      return;
    }
    html.push(
      `<pre class="my-5 overflow-x-auto rounded-lg bg-stone-900 p-4 text-sm leading-relaxed text-stone-100"><code>${escapeHtml(code.join("\n"))}</code></pre>`,
    );
    code = [];
    inCode = false;
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        flushCode();
      } else {
        flushList();
        inCode = true;
        code = [];
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const cls =
        level === 1
          ? "mt-8 mb-3 font-serif text-3xl"
          : level === 2
            ? "mt-7 mb-2 font-serif text-2xl"
            : "mt-6 mb-2 font-serif text-xl";
      html.push(`<h${level} class="${cls}">${formatInline(heading[2])}</h${level}>`);
      continue;
    }

    const ul = line.match(/^[-*]\s+(.+)$/);
    if (ul) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      list.push(ul[1]);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      list.push(ol[1]);
      continue;
    }

    if (!line.trim()) {
      flushList();
      continue;
    }

    flushList();
    html.push(`<p class="my-3 leading-7">${formatInline(line)}</p>`);
  }

  flushCode();
  flushList();
  return html.join("\n");
}
