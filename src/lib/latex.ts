/**
 * Normalises the LaTeX a model actually emits into the exact shape
 * `remark-math` needs.
 *
 * Two things go wrong without this, both verified against micromark:
 *
 * 1. Models slip into `\(…\)` / `\[…\]` despite the system prompt asking for
 *    `$…$`. Those render as literal text — worse than useless on a maths app.
 * 2. `$$x$$` written on a single line parses as *inline* math, not display,
 *    and `$$\begin{align}` opens a block fence that only closes on a `$$`
 *    alone on a line — so a trailing `\end{align}$$` swallows the whole rest
 *    of the document into one giant unparseable expression.
 *
 * So display math is re-emitted with its delimiters on their own lines. Code
 * spans are left untouched, so a genuine `\(` inside backticks survives.
 */

/** Display environments that are valid at the top level of a document. */
const DISPLAY_ENVIRONMENTS =
  "align\\*?|equation\\*?|gather\\*?|multline\\*?|alignat\\*?";

const CODE_SEGMENT = /(```[\s\S]*?```|`[^`\n]+`)/;

/**
 * Re-emits any `$$…$$` that already sits on its own line(s) as a proper block
 * fence. Leading whitespace is preserved so display math nested in a list item
 * stays in that list item. A `$$` mid-sentence is left alone — promoting it to
 * a block would tear the paragraph (or table row) apart.
 */
function fenceDisplayMath(text: string): string {
  return text.replace(
    /^([ \t]*)\$\$([\s\S]*?)\$\$[ \t]*$/gm,
    (match, indent: string, body: string) => {
      const inner = body.trim();
      if (!inner) return match;
      const indented = inner.replace(/\n/g, `\n${indent}`);
      return `${indent}$$\n${indent}${indented}\n${indent}$$`;
    },
  );
}

function normaliseSegment(text: string): string {
  const converted = text
    // \[ … \] → $$ … $$
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, body: string) => `$$${body.trim()}$$`)
    // \( … \) → $ … $
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, body: string) => `$${body.trim()}$`)
    // A bare \begin{align} … \end{align} needs wrapping before KaTeX sees it.
    .replace(
      new RegExp(
        `\\\\begin\\{(${DISPLAY_ENVIRONMENTS})\\}([\\s\\S]*?)\\\\end\\{\\1\\}`,
        "g",
      ),
      (match, _env: string, _body: string, offset: number, whole: string) => {
        // Skip it if the author already wrapped it in $$.
        if (whole.slice(0, offset).trimEnd().endsWith("$$")) return match;
        return `$$${match}$$`;
      },
    );

  // Runs last so it catches both the conversions above and any $$ the model
  // wrote itself. Idempotent: already-fenced blocks come out unchanged.
  return fenceDisplayMath(converted);
}

export function normaliseLatex(text: string): string {
  if (!text) return text;

  return text
    .split(CODE_SEGMENT)
    .map((segment) =>
      segment.startsWith("`") ? segment : normaliseSegment(segment),
    )
    .join("");
}
