import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { LoginForm } from "@/app/admin/login/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (!isDemoMode) {
    const session = await getAdminSession();
    if (session) redirect("/admin");
  }

  return (
    <div className="relative isolate flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="absolute inset-0 -z-10 bg-ink-texture" />
      <div className="cloud-motif absolute inset-0 -z-10" />

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span
            aria-hidden="true"
            className="mx-auto grid size-12 place-items-center rounded-[4px] border border-gold-500/45 bg-gold-500/10 font-serif text-xl text-gold-300"
          >
            閣
          </span>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-parchment-100">
            Đăng nhập quản trị
          </h1>
          <p className="mt-2 text-sm text-parchment-300/80">
            Ghiền Phim · Khu vực dành cho quản trị viên
          </p>
        </div>

        <div className="panel p-6">
          {isDemoMode ? (
            <div className="space-y-4">
              <div className="rounded-md border border-gold-500/35 bg-gold-500/[0.08] px-4 py-3">
                <p className="text-sm font-medium text-gold-100">Chưa cấu hình backend</p>
                <p className="mt-1.5 text-xs leading-relaxed text-parchment-300/85">
                  Ứng dụng đang chạy ở chế độ demo vì chưa có biến môi trường Supabase. Bạn có thể
                  xem và thử các màn hình quản trị, nhưng mọi thao tác lưu sẽ không được ghi vào cơ
                  sở dữ liệu.
                </p>
              </div>
              <p className="text-xs leading-relaxed text-parchment-300/80">
                Để đăng nhập thật, hãy tạo dự án Supabase, chạy các migration trong thư mục{" "}
                <code className="rounded bg-ink-800 px-1 py-0.5 text-xs text-gold-200">
                  supabase/migrations
                </code>{" "}
                và điền{" "}
                <code className="rounded bg-ink-800 px-1 py-0.5 text-xs text-gold-200">
                  .env.local
                </code>
                .
              </p>
              <a
                href="/admin"
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-gold-400 px-4 text-sm font-medium text-ink-950 transition-colors hover:bg-gold-300"
              >
                Xem bảng điều khiển demo
              </a>
            </div>
          ) : (
            <LoginForm />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-mist-500">
          <Link href="/" className="link-underline hover:text-parchment-300">
            Quay lại trang chủ
          </Link>
        </p>
      </div>
    </div>
  );
}