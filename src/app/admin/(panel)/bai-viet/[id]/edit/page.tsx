import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getStore } from "@/lib/data";
import { PostForm } from "@/components/admin/post-form";
import { updatePostAction } from "@/app/admin/(panel)/bai-viet/actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const post = await store.getPostById(id);
  return { title: post ? `Sửa: ${post.title}` : "Sửa bài viết" };
}

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const [post, movies] = await Promise.all([store.getPostById(id), store.listAllMoviesForAdmin()]);

  if (!post) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/admin/bai-viet"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-parchment-300/80 transition-colors hover:text-gold-300"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          Danh sách bài viết
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-parchment-100 sm:text-3xl">
          {post.title}
        </h1>
      </div>

      <PostForm
        movies={movies}
        postId={post.id}
        action={updatePostAction}
        submitLabel="Lưu thay đổi"
        defaults={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          coverImageUrl: post.coverImageUrl,
          type: post.type,
          status: post.status,
          weekStart: post.weekStart,
          movieIds: post.movies.map((m) => m.id),
        }}
      />
    </div>
  );
}
