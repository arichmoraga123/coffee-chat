"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Lesson Markdown with the app's dark styling (tables, lists, bold, inline code). */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("learn-md space-y-3 text-[15px] leading-relaxed text-ink sm:text-base", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 className="pt-2 text-xl font-semibold text-ink">{children}</h2>,
          h2: ({ children }) => <h2 className="pt-2 text-lg font-semibold text-ink">{children}</h2>,
          h3: ({ children }) => <h3 className="pt-1 text-base font-semibold text-ink">{children}</h3>,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          em: ({ children }) => <em className="text-ink">{children}</em>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          a: ({ children, href }) => (
            <a href={href} className="text-accent underline underline-offset-2">
              {children}
            </a>
          ),
          code: ({ children }) => <code className="rounded bg-surface-2 px-1 py-0.5 text-[0.9em]">{children}</code>,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="min-w-[260px] border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-border-strong bg-surface px-3 py-1.5 text-left">{children}</th>,
          td: ({ children }) => <td className="border border-border px-3 py-1.5">{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
