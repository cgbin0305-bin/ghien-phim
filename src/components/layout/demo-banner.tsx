import { AlertTriangle } from "lucide-react";
import { isDemoMode } from "@/lib/env";

/**
 * Demo mode is always visible. Users must never mistake seeded content for
 * the real catalogue.
 */
export function DemoBanner() {
  if (!isDemoMode) return null;

  return (
    <div
      role="status"
      className="border-b border-gold-500/25 bg-gold-500/[0.07] px-4 py-2 text-center text-xs text-gold-100/90"
    >
      <span className="inline-flex items-center gap-2">
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold">Chế độ demo.</strong> Toàn bộ phim, tập và lịch chiếu
          hiện là dữ liệu minh hoạ. Hãy cấu hình Supabase để dùng dữ liệu thật.
        </span>
      </span>
    </div>
  );
}
