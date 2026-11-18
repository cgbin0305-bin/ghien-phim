import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { getStore } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { AdminPostList } from "@/components/admin/admin-post-list";
import { isDemoMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata = { title: "Quản lý bài viết" };

const TYPE_LABELS: Record<string, string> = {
  weekly_schedule: "Lịch chiếu tuần",
  movie_intro: "Giới thiệu phim",
  announcement: "Thông báo",
};

export default async function AdminPostsPage() {
  const store = await getStore();
  const posts = await store.listAllPostsForAdmin();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-parchment-100 sm:text-3xl">
            Quản lý bài viết
          </h1>
          <p className="mt-1.5 text-sm text-parchment-300/85">
            {posts.length} bài · {posts.filter((p) => p.status === "published").length} đã xuất bản
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/bai-viet/new">
            <FilePlus2 aria-hidden="true" />
            Viết bài
          </Link>
        </Button>
      </header>

      {isDemoMode && (
        <p className="rounded-md border border-gold-500/35 bg-gold-500/[0.07] px-4 py-3 text-xs leading-relaxed text-parchment-300/75">
          Chế độ demo: thao tác lưu bài viết sẽ không được ghi vào cơ sở dữ liệu.
        </p>
      )}

      {posts.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <p className="font-serif text-base text-parchment-200">Chưa có bài viết nào</p>
          <p className="mt-1.5 text-sm text-parchment-300/80">
            Viết bài lịch chiếu tuần, giới thiệu phim hoặc thông báo.
          </p>
        </div>
      ) : (
        <AdminPostList posts={posts} typeLabels={TYPE_LABELS} />
      )}
    </div>
  );
}
