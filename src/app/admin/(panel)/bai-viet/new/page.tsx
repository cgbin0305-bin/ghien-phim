import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getStore } from "@/lib/data";
import { PostForm } from "@/components/admin/post-form";
import { createPostAction } from "@/app/admin/(panel)/bai-viet/actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Viết bài viết" };

export default async function NewPostPage() {
  const store = await getStore();
  const movies = await store.listAllMoviesForAdmin();

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
          Viết bài viết
        </h1>
        <p className="mt-1.5 text-sm text-parchment-300/85">
          Nội dung Markdown được lọc an toàn trước khi hiển thị với khách.
        </p>
      </div>

      <PostForm movies={movies} defaults={{}} action={createPostAction} submitLabel="Tạo bài viết" />
    </div>
  );
}
