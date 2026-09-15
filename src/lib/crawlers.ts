/** Zoekmachines en AI-crawlers die de wiki mogen indexeren, ook van buiten Europa. */
const INDEXING_BOT =
  /Googlebot|Google-InspectionTool|GoogleOther|Google-Extended|AdsBot-Google|Mediapartners-Google|Bingbot|adidxbot|MicrosoftPreview|Slurp|DuckDuckBot|Baiduspider|YandexBot|YandexImages|GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic-ai|PerplexityBot|Applebot|Applebot-Extended|CCBot|Bytespider|cohere-ai|Amazonbot|meta-externalagent|FacebookBot|IA-Archiver|ia_archiver|SemrushBot|AhrefsBot|DotBot|PetalBot|YouBot|KagiBot|TimpiBot|Timpibot|PhindBot|AndiBot|You\.com|Neeva|Bravebot|Qwantify/i;

export function isIndexingBot(userAgent: string | string[] | undefined): boolean {
  const value = Array.isArray(userAgent) ? userAgent[0] : userAgent;
  if (!value) {
    return false;
  }
  return INDEXING_BOT.test(value);
}
