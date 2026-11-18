import { getStore } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cài đặt website" };

export default async function AdminSettingsPage() {
  const store = await getStore();
  const [settings, movies] = await Promise.all([
    store.getSettings(),
    store.listAllMoviesForAdmin(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-parchment-100 sm:text-3xl">
          Cài đặt website
        </h1>
        <p className="mt-1.5 text-sm text-parchment-300/85">
          Tên website, thông tin liên hệ, metadata SEO và phim nổi bật trên trang chủ.
        </p>
      </header>

      {isDemoMode && (
        <p className="rounded-md border border-gold-500/35 bg-gold-500/[0.07] px-4 py-3 text-xs leading-relaxed text-parchment-300/75">
          Chế độ demo: thao tác lưu cài đặt sẽ không được ghi vào cơ sở dữ liệu.
        </p>
      )}

      <SettingsForm settings={settings} movies={movies} />
    </div>
  );
}
