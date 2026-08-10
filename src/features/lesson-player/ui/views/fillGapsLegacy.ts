/** Shared helpers for legacy fill-gaps (dataText + fields[]). */

export type FieldOption = {value: string; isCorrect?: boolean};
export type GapField = {
  id: string;
  options?: FieldOption[];
  originalWord?: string;
  value?: string;
};

/** Split HTML around answerWrapper spans so we can interleave gap controls. */
export function splitDataText(dataText?: string): Array<
  {type: 'text'; html: string} | {type: 'gap'; id: string}
> {
  const html = dataText || '';
  const re =
    /<[^>]*class=["'][^"']*answerWrapper[^"']*["'][^>]*\bid=["']([^"']+)["'][^>]*>[\s\S]*?<\/[^>]+>/gi;
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
