import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/utils";

/**
 * Renders Markdown content safely.
 *
 * `rehype-sanitize` strips every raw HTML tag, event handler and `javascript:`
 * URL, so admin-authored content can never execute scripts in a visitor's
 * browser. The schema is deliberately restrictive - no custom elements, no
 * iframes, no style attributes.
 */
const sanitizeSchema = {
  tagNames: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "strong", "em", "del", "blockquote",
    "ul", "ol", "li",
    "a", "img",
    "code", "pre",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  attributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    code: ["className"],
  },
  protocols: {
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
};

export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("text-[15px] leading-relaxed text-parchment-200/85", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          a: ({ href, children, ...props }) => {
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="text-gold-200 underline-offset-4 hover:underline"
                {...props}
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt ?? ""}
              loading="lazy"
              className="mx-auto my-5 max-h-[420px] rounded-md border border-ink-700 object-contain"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}