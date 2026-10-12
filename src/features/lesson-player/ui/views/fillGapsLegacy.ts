/** Shared helpers for legacy fill-gaps (dataText + fields[]). */

export type FieldOption = {value: string; isCorrect?: boolean};
export type GapField = {
  id: string;
  options?: FieldOption[];
  originalWord?: string;
  value?: string;
};

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'");
}

/**
 * Plain text for inline fill-gaps flow. HtmlContent width:100% forces each
 * fragment onto its own line in a flexWrap row.
 */
export function gapHtmlToPlainText(html?: string): string {
  if (!html) {
    return '';
  }
  return decodeBasicEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Split HTML around answerWrapper nodes so we can interleave gap controls. */
export function splitDataText(dataText?: string): Array<
  {type: 'text'; html: string} | {type: 'gap'; id: string}
> {
  const html = dataText || '';
  // Match both closed tags and self-closing editor placeholders.
  const re =
    /<[^>]*class=["'][^"']*answerWrapper[^"']*["'][^>]*\bid=["']([^"']+)["'][^>]*(?:\/>|>[\s\S]*?<\/[^>]+>)/gi;
  const parts: Array<{type: 'text'; html: string} | {type: 'gap'; id: string}> =
    [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m.index > last) {
      parts.push({type: 'text', html: html.slice(last, m.index)});
    }
    parts.push({type: 'gap', id: m[1]});
    last = m.index + m[0].length;
  }
  if (last < html.length) {
    parts.push({type: 'text', html: html.slice(last)});
  }
  if (!parts.length) {
    parts.push({type: 'text', html});
  }
  return parts;
}

export function isCorrectOption(field: GapField | undefined, value: string) {
  if (!field || !value) return false;
  const norm = (s: string) =>
    s.toLowerCase().trim().split('’').join("'");
  const selected = norm(value);
  if (field.value && norm(field.value) === selected) return true;
  return !!(field.options || []).find(o => {
    if (norm(o.value || '') !== selected) return false;
    return o.isCorrect !== false;
  });
}
