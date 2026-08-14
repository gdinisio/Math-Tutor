import assert from "node:assert/strict";
import { test } from "node:test";
import { normaliseLatex } from "./latex.ts";

test("converts inline \\( \\) to $ $", () => {
  assert.equal(normaliseLatex("Evaluate \\( x^2 \\) now"), "Evaluate $x^2$ now");
});

test("converts \\[ \\] into a fenced display block", () => {
  assert.equal(normaliseLatex("\\[ x^2 \\]"), "$$\nx^2\n$$");
});

test("promotes single-line $$…$$ to a fenced block", () => {
  // micromark parses `$$x$$` on one line as *inline* math, not display.
  assert.equal(normaliseLatex("$$x^2$$"), "$$\nx^2\n$$");
});

test("wraps a bare align environment without swallowing what follows", () => {
  const input = [
    "Before.",
    "",
    "\\begin{align}",
    "a &= b",
    "\\end{align}",
    "",
    "## After",
  ].join("\n");

  const out = normaliseLatex(input);

  assert.match(out, /^\$\$$/m, "opens with a fence on its own line");
  assert.ok(out.includes("\\begin{align}"), "keeps the environment");
  assert.ok(out.endsWith("## After"), "later content survives");
  // The closing fence must be alone on a line or it never terminates.
  assert.ok(!/\\end\{align\}\$\$/.test(out), "closing $$ is not trailing");
});

test("is idempotent", () => {
  const once = normaliseLatex("\\[ x^2 \\]");
  assert.equal(normaliseLatex(once), once);
});

test("leaves LaTeX inside code spans alone", () => {
  const input = "Literal: `\\(x\\)` stays";
  assert.equal(normaliseLatex(input), input);
});

test("does not promote $$ that sits mid-sentence", () => {
  // Promoting this would tear the paragraph (or a table row) apart.
  const input = "text $$x$$ more text";
  assert.equal(normaliseLatex(input), input);
});

test("preserves indentation so display math stays inside its list item", () => {
  const out = normaliseLatex("- point\n  $$x^2$$");
  assert.equal(out, "- point\n  $$\n  x^2\n  $$");
});

test("leaves an unterminated block alone mid-stream", () => {
  const partial = "## Solution\n\n$$\n\\int_0^1";
  assert.equal(normaliseLatex(partial), partial);
});

test("handles empty and plain input", () => {
  assert.equal(normaliseLatex(""), "");
  assert.equal(normaliseLatex("no maths here"), "no maths here");
});
