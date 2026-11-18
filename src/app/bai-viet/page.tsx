import type { Metadata } from "next";
import { getPublicStore } from "@/lib/data";
import { PostCard } from "@/components/movie/post-card";

export const metadata: Metadata = {
  title: "Bài viết",
  description:
    "Giới thiệu phim, cập nhật tập mới và lịch chiếu hằng tuần của Ghiền Phim.",
  alternates: { canonical: "/bai-viet" },
};

export const revalidate = 300;

export default async function PostsPage() {
  const store = await getPublicStore();
  const posts = await store.listPosts();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="font-serif text-3xl font-semibold text-parchment-100 sm:text-4xl">
          Bài viết
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-parchment-300/85">
          Giới thiệu phim, thông báo cập nhật và bài lịch chiếu tuần.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="panel mt-8 px-5 py-16 text-center">
          <p className="font-serif text-lg text-parchment-100">Chưa có bài viết nào</p>
          <p className="mt-2 text-sm text-parchment-300/80">
            Bài viết sẽ xuất hiện khi quản trị viên xuất bản.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}