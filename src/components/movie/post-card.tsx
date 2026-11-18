import { ArrowUpRight, CalendarRange, Megaphone, ScrollText } from "lucide-react";
import type { Post } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { SafeImage } from "@/components/ui/safe-image";
import { formatDate } from "@/lib/date";

const TYPE_LABELS: Record<Post["type"], string> = {
  weekly_schedule: "Lịch chiếu tuần",
  movie_intro: "Giới thiệu phim",
  announcement: "Thông báo",
};

const TYPE_ICONS = {
  weekly_schedule: CalendarRange,
  movie_intro: ScrollText,
  announcement: Megaphone,
} as const;

export function PostCard({ post }: { post: Post }) {
  const Icon = TYPE_ICONS[post.type];

  return (
    <article className="card-cinematic group flex h-full flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-850/65">
      <PrefetchLink href={`/bai-viet/${post.slug}`} className="block">
        <div className="oriental-frame shine-effect relative aspect-[16/9] overflow-hidden bg-ink-850">
          {post.coverImageUrl && (
            <SafeImage
              src={post.coverImageUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/25 to-transparent" />
          <Badge variant="gold" className="absolute left-3 top-3 gap-1.5 backdrop-blur-md">
            <Icon className="size-3" aria-hidden="true" />
            {TYPE_LABELS[post.type]}
          </Badge>
        </div>
      </PrefetchLink>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <h3 className="font-serif text-lg font-semibold leading-snug text-parchment-100 transition-colors group-hover:text-gold-200">
          <PrefetchLink href={`/bai-viet/${post.slug}`} className="link-underline">
            {post.title}
          </PrefetchLink>
        </h3>
        {post.excerpt && (
          <p className="line-clamp-3 text-sm leading-relaxed text-parchment-300/85">
            {post.excerpt}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-ink-700/60 pt-3 text-xs text-mist-400">
          <span>{post.publishedAt ? formatDate(post.publishedAt) : "Chưa xuất bản"}</span>
          <PrefetchLink
            href={`/bai-viet/${post.slug}`}
            className="inline-flex items-center gap-1 font-medium text-gold-300/90 transition-colors group-hover:text-gold-200"
          >
            Đọc tiếp
            <ArrowUpRight
              className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </PrefetchLink>
        </div>
      </div>
    </article>
  );
}
