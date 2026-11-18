"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import {
  incrementMovieReactionAction,
  type ReactionCounts,
  type ReactionKey,
} from "@/app/actions/community";
import { cn } from "@/lib/utils";

interface ReactionItemSpec {
  key: ReactionKey;
  emoji: string;
  label: string;
  seal: string;
}

const REACTION_SPECS: readonly ReactionItemSpec[] = [
  { key: "tuyet_pham", emoji: "🔥", label: "Tuyệt Phẩm", seal: "絕" },
  { key: "dao_huu", emoji: "⚔️", label: "Đạo Hữu Điểm Danh", seal: "劍" },
  { key: "hong_tap", emoji: "⏳", label: "Hóng Tập Mới", seal: "期" },
  { key: "cam_dong", emoji: "😭", label: "Cảm Động", seal: "情" },
] as const;

interface BurstParticle {
  id: number;
  reactionKey: ReactionKey;
  emoji: string;
}

interface CultivationReactionsProps {
  movieId: string;
  movieSlug: string;
  initialCounts?: ReactionCounts;
}

/**
 * Thanh "Cảm Xúc Đạo Hữu" (0ms Optimistic UI + Hạt sáng bay lên + Đồng bộ ngầm Supabase).
 */
export function CultivationReactions({
  movieId,
  movieSlug,
  initialCounts,
}: CultivationReactionsProps) {
  const storageKey = `gheienphim.reactions.${movieId || movieSlug}`;

  // Số nền cơ sở lấy từ Server/Supabase (hoặc tạo mức khởi điểm tự nhiên theo tên phim)
  const baseSeed = React.useMemo<ReactionCounts>(() => {
    const hash = (movieSlug || movieId)
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return {
      tuyet_pham: initialCounts?.tuyet_pham || 18 + (hash % 25),
      dao_huu: initialCounts?.dao_huu || 12 + ((hash * 3) % 19),
      hong_tap: initialCounts?.hong_tap || 15 + ((hash * 7) % 22),
      cam_dong: initialCounts?.cam_dong || 6 + ((hash * 5) % 14),
    };
  }, [movieId, movieSlug, initialCounts]);

  const [counts, setCounts] = React.useState<ReactionCounts>(baseSeed);
  const [userClicked, setUserClicked] = React.useState<Partial<Record<ReactionKey, number>>>({});
  const [bursts, setBursts] = React.useState<BurstParticle[]>([]);
  const burstCounterRef = React.useRef(0);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setCounts(baseSeed);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<Record<ReactionKey, number>>;
      if (parsed && typeof parsed === "object") {
        setUserClicked(parsed);
        setCounts({
          tuyet_pham: baseSeed.tuyet_pham + (Number(parsed.tuyet_pham) || 0),
          dao_huu: baseSeed.dao_huu + (Number(parsed.dao_huu) || 0),
          hong_tap: baseSeed.hong_tap + (Number(parsed.hong_tap) || 0),
          cam_dong: baseSeed.cam_dong + (Number(parsed.cam_dong) || 0),
        });
      }
    } catch {
      setCounts(baseSeed);
    }
  }, [storageKey, baseSeed]);

  function handleReact(spec: ReactionItemSpec) {
    // 1. Optimistic UI 0ms: tăng số đếm ngay lập tức
    setCounts((prev) => ({
      ...prev,
      [spec.key]: (prev[spec.key] ?? 0) + 1,
    }));

    const nextClicked = {
      ...userClicked,
      [spec.key]: (userClicked[spec.key] ?? 0) + 1,
    };
    setUserClicked(nextClicked);

    // 2. Tạo hiệu ứng hạt sáng & chữ "+1" bay lên
    const particleId = (burstCounterRef.current += 1);
    setBursts((prev) => [...prev, { id: particleId, reactionKey: spec.key, emoji: spec.emoji }]);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== particleId));
    }, 850);

    // 3. Lưu vào localStorage cho từng phim
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextClicked));
      window.dispatchEvent(new CustomEvent("gheienphim:reactions-change"));
    } catch {
      // Ignore storage failures.
    }

    // 4. Đồng bộ ngầm (non-blocking) lên Supabase
    void incrementMovieReactionAction(movieId, spec.key).catch(() => {
      // Graceful fallback
    });
  }

  return (
    <section
      aria-label="Cảm xúc đạo hữu"
      className="mt-4 rounded-xl border border-gold-500/30 bg-ink-900/75 p-3.5 sm:p-4"
    >
      <style>{`
        @keyframes floatCultivationParticle {
          0% {
            opacity: 1;
            transform: translate3d(-50%, 0, 0) scale(0.85);
          }
          60% {
            opacity: 1;
            transform: translate3d(-50%, -28px, 0) scale(1.15);
          }
          100% {
            opacity: 0;
            transform: translate3d(-50%, -46px, 0) scale(0.95);
          }
        }
        .cultivation-particle {
          animation: floatCultivationParticle 820ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform, opacity;
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-gold-300" aria-hidden="true" />
          <span className="font-serif text-sm font-semibold tracking-wide text-parchment-100 sm:text-base">
            Cảm Xúc Đạo Hữu
          </span>
        </div>
        <span className="text-xs text-parchment-300/80">
          Chạm để truyền linh lực (không cần đăng nhập · phản hồi 0ms)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {REACTION_SPECS.map((spec) => {
          const isReacted = Boolean(userClicked[spec.key]);
          const count = counts[spec.key] ?? 0;
          const activeBursts = bursts.filter((b) => b.reactionKey === spec.key);

          return (
            <button
              key={spec.key}
              type="button"
              onClick={() => handleReact(spec)}
              aria-pressed={isReacted}
              className={cn(
                "group relative flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-all duration-200 active:scale-105",
                isReacted
                  ? "border-gold-400/75 bg-gradient-to-br from-gold-500/20 via-ink-850 to-gold-500/10 text-gold-200 shadow-[0_0_20px_-4px_rgba(212,175,55,0.45)]"
                  : "border-ink-700 bg-ink-850/85 text-parchment-200 hover:-translate-y-0.5 hover:border-gold-500/45 hover:bg-ink-800 hover:text-gold-200",
              )}
            >
              {/* Hạt sáng bay lên khi bấm */}
              {activeBursts.map((b) => (
                <span
                  key={b.id}
                  aria-hidden="true"
                  className="cultivation-particle pointer-events-none absolute left-1/2 top-0 z-20 inline-flex items-center gap-1 rounded-full border border-gold-300/80 bg-ink-950/95 px-2 py-0.5 text-xs font-bold text-gold-200 shadow-[0_0_16px_rgba(212,175,55,0.85)]"
                >
                  <span>{b.emoji}</span>
                  <span>+1</span>
                </span>
              ))}

              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="text-base leading-none transition-transform duration-200 group-hover:scale-125"
                  aria-hidden="true"
                >
                  {spec.emoji}
                </span>
                <span className="truncate text-xs font-medium">{spec.label}</span>
              </span>

              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors",
                  isReacted
                    ? "bg-gold-400 text-ink-950 shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                    : "bg-ink-900/90 text-gold-300",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
