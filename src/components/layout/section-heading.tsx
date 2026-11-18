import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeadingProps {
  id: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}

export function SectionHeading({ id, title, description, href, linkLabel }: SectionHeadingProps) {
  return (
    <div className="relative flex flex-col gap-2 border-b border-ink-700/75 pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="inline-block h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-gold-300 via-gold-400 to-gold-700 shadow-[0_0_10px_rgba(217,174,73,0.5)]"
          />
          <h2
            id={id}
            className="font-serif text-2xl font-bold tracking-tight text-parchment-100 sm:text-3xl"
          >
            {title}
          </h2>
          <span
            aria-hidden="true"
            className="hidden font-serif text-xs text-gold-400/75 sm:inline"
          >
            ❖
          </span>
        </div>
        {description && (
          <p className="mt-1.5 pl-3.5 text-sm text-parchment-300/80">{description}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-gold-500/30 bg-gold-500/[0.06] px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-gold-200 transition-all duration-200 hover:border-gold-400/60 hover:bg-gold-500/15 hover:text-gold-100 sm:self-auto"
        >
          {linkLabel ?? "Xem tất cả"}
          <ArrowRight
            className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  );
}
