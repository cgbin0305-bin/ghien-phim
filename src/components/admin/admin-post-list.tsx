"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { deletePostAction } from "@/app/admin/(panel)/bai-viet/actions";
import type { Post } from "@/lib/types";

export function AdminPostList({
  posts,
  typeLabels,
}: {
  posts: Post[];
  typeLabels: Record<string, string>;
}) {
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [pendingDelete, setPendingDelete] = React.useState<Post | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (statusFilter !== "all" && post.status !== statusFilter) return false;
      if (!q) return true;
      return post.title.toLowerCase().includes(q) || post.slug.includes(q);
    });
  }, [posts, query, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tiêu đề hoặc slug…"
          aria-label="Tìm bài viết"
        />
        <div className="flex rounded-md border border-ink-700 bg-ink-850 p-1">
          {[
            { value: "all", label: "Tất cả" },
            { value: "published", label: "Đã xuất bản" },
            { value: "draft", label: "Bản nháp" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatusFilter(item.value)}
              aria-pressed={statusFilter === item.value}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                statusFilter === item.value
                  ? "bg-gold-500/15 text-gold-200"
                  : "text-parchment-300/85 hover:text-parchment-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <p className="font-serif text-base text-parchment-200">Không tìm thấy bài viết nào</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((post) => (
            <li key={post.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/bai-viet/${post.id}/edit`}
                      className="font-medium text-parchment-100 hover:text-gold-200"
                    >
                      {post.title}
                    </Link>
                    <Badge variant={post.status === "published" ? "jade" : "muted"}>
                      {post.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                    </Badge>
                    <Badge variant="outline">{typeLabels[post.type] ?? post.type}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-mist-500">/bai-viet/{post.slug}</p>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-2 text-sm text-parchment-300/85">{post.excerpt}</p>
                  )}
                  {post.movies.length > 0 && (
                    <p className="mt-1.5 text-xs text-mist-500">
                      Phim liên quan: {post.movies.map((m) => m.title).join(", ")}
                    </p>
                  )}
                  {post.weekStart && (
                    <p className="mt-0.5 text-xs text-mist-500">Tuần bắt đầu: {post.weekStart}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {post.status === "published" && (
                    <Button asChild variant="ghost" size="icon-sm" title="Xem trang công khai">
                      <a
                        href={`/bai-viet/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink aria-hidden="true" />
                        <span className="sr-only">Xem trang công khai</span>
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/admin/bai-viet/${post.id}/edit`}>
                      <Pencil aria-hidden="true" />
                      Sửa
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Xoá bài viết"
                    onClick={() => setPendingDelete(post)}
                  >
                    <Trash2 className="text-rouge-400" aria-hidden="true" />
                    <span className="sr-only">Xoá bài viết</span>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Xoá bài viết “${pendingDelete?.title ?? ""}”?`}
        description="Thao tác này xoá vĩnh viễn bài viết và nội dung Markdown của nó."
        consequences={[
          "Bài viết sẽ không còn xuất hiện trên trang /bai-viet.",
          "Liên kết tới bài viết này từ nơi khác sẽ dẫn tới trang 404.",
        ]}
        confirmLabel="Xoá bài viết"
        action={deletePostAction}
        hiddenFields={pendingDelete ? { id: pendingDelete.id, confirm: pendingDelete.id } : undefined}
      />
    </div>
  );
}
