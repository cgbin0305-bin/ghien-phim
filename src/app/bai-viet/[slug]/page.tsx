import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, ChevronLeft, Megaphone, ScrollText } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { getPublicStore } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { MarkdownContent } from "@/components/movie/markdown-content";
import { formatDate } from "@/lib/date";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

const TYPE_LABELS = {
  weekly_schedule: "Lịch chiếu tuần",
  movie_intro: "Giới thiệu phim",
  announcement: "Thông báo",
} as const;

const TYPE_ICONS = {
  weekly_schedule: CalendarRange,
  movie_intro: ScrollText,
  announcement: Megaphone,
} as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStore();
  const post = await store.getPostBySlug(slug);

  if (!post || post.status !== "published") {
    return { title: "Không tìm thấy bài viết", robots: { index: false, follow: false } };
  }

  return {
    title: post.title,
    description: post.excerpt ?? post.content.replace(/[#*_>`]/g, "").slice(0, 300),
    alternates: { canonical: `/bai-viet/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt ?? undefined,
      publishedTime: post.publishedAt ?? undefined,
      locale: "vi_VN",
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
  };
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const store = await getPublicStore();

  const post = await store.getPostBySlug(slug);
  if (!post) notFound();

  const Icon = TYPE_ICONS[post.type];

  return (
    <div className="mx-auto max-w-[820px] px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/bai-viet"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-parchment-300/80 transition-colors hover:text-gold-200"
      >
        <ChevronLeft className="size-3.5" aria-hidden="true" />
        Bài viết
      </Link>

      <article className="mt-6">
        <header>
          <Badge variant="gold" className="gap-1.5">
            <Icon className="size-3" aria-hidden="true" />
            {TYPE_LABELS[post.type]}
          </Badge>

          <h1 className="mt-4 font-serif text-3xl font-semibold leading-tight text-parchment-100 text-balance sm:text-4xl">
            {post.title}
          </h1>

          <p className="mt-3 text-sm text-mist-500">
            {post.publishedAt ? `Xuất bản ${formatDate(post.publishedAt)}` : "Chưa xuất bản"}
            {post.weekStart ? ` · Tuần bắt đầu ${post.weekStart}` : ""}
          </p>

          {post.excerpt && (
            <p className="mt-5 border-l-2 border-gold-500/50 pl-4 text-[15px] leading-relaxed text-parchment-200/90">
              {post.excerpt}
            </p>
          )}
        </header>

        {post.coverImageUrl && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-md border border-ink-700 bg-ink-850">
            <SafeImage
              src={post.coverImageUrl}
              alt=""
              fill
              priority
              sizes="(max-width: 900px) 100vw, 820px"
              className="object-cover"
            />
          </div>
        )}

        <div className="mt-9">
          <MarkdownContent content={post.content} />
        </div>

        {post.movies.length > 0 && (
          <section aria-labelledby="phim-lien-quan-bai-viet" className="mt-12 border-t border-ink-700/70 pt-8">
            <h2
              id="phim-lien-quan-bai-viet"
              className="font-serif text-lg font-semibold text-parchment-100"
            >
              Phim liên quan
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {post.movies.map((movie) => (
                <li key={movie.id}>
                  <Link
                    href={`/phim/${movie.slug}`}
                    className="group flex items-center gap-3 rounded-md border border-ink-700 bg-ink-850/50 p-3 transition-colors hover:border-gold-500/40"
                  >
                    <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded border border-ink-700 bg-ink-850">
                      {movie.posterUrl && (
                        <SafeImage
                          src={movie.posterUrl}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm text-parchment-100 group-hover:text-gold-200">
                      {movie.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
}