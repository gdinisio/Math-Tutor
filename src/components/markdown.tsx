"use client";

import { memo, type ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { normaliseLatex } from "@/lib/latex";

type MarkdownProps = ComponentProps<typeof ReactMarkdown>;

const REMARK_PLUGINS: NonNullable<MarkdownProps["remarkPlugins"]> = [
  remarkGfm,
  remarkMath,
];

const REHYPE_PLUGINS: NonNullable<MarkdownProps["rehypePlugins"]> = [
  [
    rehypeKatex,
    {
      // Feedback renders while it streams, so half-written expressions are
      // normal. Show them in muted body colour rather than throwing, or
      // flashing KaTeX's alarming red until the closing delimiter arrives.
      throwOnError: false,
      errorColor: "var(--color-ink-muted)",
    },
  ],
];

const COMPONENTS: NonNullable<MarkdownProps["components"]> = {
  a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  // Wide tables scroll inside the panel instead of stretching the layout.
  table: (props) => (
    <div className="feedback-table-scroll">
      <table {...props} />
    </div>
  ),
};

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={COMPONENTS}
    >
      {normaliseLatex(text)}
    </ReactMarkdown>
  );
});
