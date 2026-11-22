"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Check, Copy, Sparkles, X } from "lucide-react";
import { DONATE_CONFIG, type DonateConfig } from "@/config/donateConfig";
import { getLatestDonateConfigAction } from "@/app/actions/donate";
import { cn } from "@/lib/utils";

export interface DonateModalProps {
  open: boolean;
  onClose: () => void;
  config?: DonateConfig;
}

type CopyField = "accountNumber" | "transferContent";

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback sang textarea nếu clipboard API bị chặn
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

/**
 * 3. <DonateModal /> (Popup thông tin chuyển khoản Thưởng Linh Thạch):
 * - Dùng <AnimatePresence> và motion.div kèm nền mờ backdrop-blur-sm.
 * - Hiển thị 100% thông tin từ DONATE_CONFIG (QR, Ngân hàng, Chủ TK, Số TK, Nội dung CK).
 * - Tích hợp nút Sao chép nhanh (Copy) bên cạnh Số tài khoản và Nội dung chuyển khoản,
 *   đổi sang dấu tick xanh và báo "Đã sao chép!" trong 2 giây.
 */
export function DonateModal({
  open,
  onClose,
  config = DONATE_CONFIG,
}: DonateModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [copiedField, setCopiedField] = React.useState<CopyField | null>(null);
  const [qrFailed, setQrFailed] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    setQrFailed(false);
  }, [config.qrImageUrl]);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleCopy = async (field: CopyField, value: string) => {
    await copyTextToClipboard(value);
    setCopiedField(field);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  if (!mounted) return null;

  const isJsdom =
    typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent || "");

  const modalNode = (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <div
            key="donate-spirit-stone-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="donate-modal-title"
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6"
          >
            {/* Lớp nền mờ backdrop-blur-sm, bấm ra ngoài để đóng */}
            <motion.div
              aria-hidden="true"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={isJsdom ? undefined : { opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Khung Popup Cổ Phong */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={isJsdom ? undefined : { opacity: 0, scale: 0.92, y: 14 }}
              transition={{ type: "spring", stiffness: 320, damping: 25 }}
              className="oriental-frame relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gold-400/70 bg-ink-900 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_50px_rgba(212,175,55,0.28)]"
            >
              {/* Dải ánh kim đỉnh hộp */}
              <div
                aria-hidden="true"
                className="h-2 w-full bg-gradient-to-r from-rouge-500/40 via-gold-300/80 to-rouge-500/40"
              />

              {/* Nút Đóng X */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng cửa sổ ủng hộ"
                className="absolute right-4 top-4 z-20 inline-flex size-8 items-center justify-center rounded-full border border-gold-400/45 bg-ink-950/85 text-parchment-100 transition-colors hover:border-gold-300 hover:bg-rouge-500/80 hover:text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>

              <div className="space-y-5 p-5 sm:p-7">
                {/* Header tiêu đề & lời nhắn từ DONATE_CONFIG */}
                <div className="text-center">
                  <span className="seal-stamp inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 font-serif text-xs font-semibold tracking-widest">
                    <Sparkles className="size-3 text-gold-300" aria-hidden="true" />
                    靈石 · {config.buttonText}
                  </span>
                  <h2
                    id="donate-modal-title"
                    className="mt-2.5 font-serif text-2xl font-bold text-gold-200 sm:text-3xl"
                  >
                    {config.title}
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-parchment-200 sm:text-sm">
                    {config.message}
                  </p>
                </div>

                {/* Khung Ảnh Mã QR viền vàng kim cổ điển */}
                <div className="flex flex-col items-center">
                  <div className="oriental-frame relative overflow-hidden rounded-xl border-2 border-gold-400/75 bg-white p-3 shadow-[0_0_32px_rgba(212,175,55,0.28)]">
                    {!qrFailed && config.qrImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={config.qrImageUrl}
                        alt={`Mã QR chuyển khoản ${config.bankName}`}
                        width={220}
                        height={220}
                        onError={() => setQrFailed(true)}
                        className="size-52 object-contain sm:size-56"
                      />
                    ) : (
                      <div className="grid size-52 place-items-center bg-ink-950 p-4 text-center text-xs text-parchment-200 sm:size-56">
                        <span>Quét mã hoặc chuyển khoản theo thông tin bên dưới</span>
                      </div>
                    )}
                  </div>
                  <span className="mt-2 text-xs text-mist-400">
                    Quét mã VietQR bằng ứng dụng Ngân hàng hoặc Ví điện tử
                  </span>
                </div>

                {/* Bảng thông tin chuyển khoản đọc 100% từ DONATE_CONFIG */}
                <div className="space-y-2.5 rounded-xl border border-gold-500/30 bg-ink-950/75 p-4">
                  <div className="flex items-center justify-between gap-3 border-b border-ink-800 pb-2.5 text-xs sm:text-sm">
                    <span className="text-mist-400">Ngân hàng</span>
                    <span className="font-semibold text-parchment-100">{config.bankName}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-b border-ink-800 pb-2.5 text-xs sm:text-sm">
                    <span className="text-mist-400">Chủ tài khoản</span>
                    <span className="font-semibold text-gold-200">{config.accountHolder}</span>
                  </div>

                  {/* Số tài khoản + Nút Sao chép nhanh */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 pb-2.5 text-xs sm:text-sm">
                    <div className="min-w-0">
                      <span className="block text-xs text-mist-400">Số tài khoản</span>
                      <span className="font-mono text-sm font-bold tracking-wider text-parchment-100 sm:text-base">
                        {config.accountNumber}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleCopy("accountNumber", config.accountNumber)}
                      aria-label="Sao chép số tài khoản"
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95",
                        copiedField === "accountNumber"
                          ? "border-jade-400/75 bg-jade-500/20 text-jade-100"
                          : "border-gold-500/45 bg-ink-850 text-gold-200 hover:border-gold-400 hover:bg-gold-500/15",
                      )}
                    >
                      {copiedField === "accountNumber" ? (
                        <>
                          <Check className="size-3.5 text-jade-300" aria-hidden="true" />
                          <span>Đã sao chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5 text-gold-300" aria-hidden="true" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Nội dung chuyển khoản + Nút Sao chép nhanh */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs sm:text-sm">
                    <div className="min-w-0">
                      <span className="block text-xs text-mist-400">Nội dung chuyển khoản</span>
                      <span className="font-mono text-sm font-bold tracking-wide text-gold-300">
                        {config.transferContent}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleCopy("transferContent", config.transferContent)}
                      aria-label="Sao chép nội dung chuyển khoản"
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95",
                        copiedField === "transferContent"
                          ? "border-jade-400/75 bg-jade-500/20 text-jade-100"
                          : "border-gold-500/45 bg-ink-850 text-gold-200 hover:border-gold-400 hover:bg-gold-500/15",
                      )}
                    >
                      {copiedField === "transferContent" ? (
                        <>
                          <Check className="size-3.5 text-jade-300" aria-hidden="true" />
                          <span>Đã sao chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5 text-gold-300" aria-hidden="true" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dải ánh kim đáy hộp */}
              <div
                aria-hidden="true"
                className="h-1.5 w-full bg-gradient-to-r from-gold-500/20 via-gold-400/65 to-gold-500/20"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );

  return createPortal(modalNode, document.body);
}

/**
 * 2. <DonateTriggerButton /> (Nút kích hoạt Thưởng Linh Thạch):
 * - Đặt ở thanh công cụ ngay bên dưới khung iframe video (cạnh nút Tắt đèn / Rạp Chiếu).
 * - Tông vàng kim / đỏ chu sa cổ trang, có icon Ngọc Bội / Linh Thạch và hiệu ứng
 *   ánh sáng lướt nhẹ định kỳ (shimmer) thu hút sự chú ý tinh tế.
 */
export function DonateTriggerButton({
  config = DONATE_CONFIG,
  className,
}: {
  config?: DonateConfig;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [activeConfig, setActiveConfig] = React.useState<DonateConfig>(config);

  React.useEffect(() => {
    setActiveConfig(config);
  }, [config]);

  const refreshFromServer = React.useCallback(async () => {
    if (
      typeof navigator !== "undefined" &&
      /jsdom/i.test(navigator.userAgent || "")
    ) {
      return;
    }
    try {
      const latest = await getLatestDonateConfigAction();
      if (latest && latest.accountNumber) {
        setActiveConfig(latest);
      }
    } catch {
      // Giữ nguyên cấu hình hiện tại nếu lỗi mạng
    }
  }, []);

  React.useEffect(() => {
    void refreshFromServer();
  }, [refreshFromServer]);

  const handleOpen = () => {
    setOpen(true);
    void refreshFromServer();
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.button
        type="button"
        onClick={handleOpen}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        title={`${activeConfig.buttonText} — ${activeConfig.title}`}
        className={cn(
          "group relative inline-flex h-8 cursor-pointer items-center gap-1.5 overflow-hidden rounded-md border border-gold-400/75 bg-gradient-to-r from-[#b8322b] via-[#c83e37] to-[#9e2b25] px-3 text-xs font-semibold text-parchment-100 shadow-[0_0_18px_-3px_rgba(212,175,55,0.48)] transition-all duration-300 hover:border-gold-300 hover:shadow-[0_0_24px_-2px_rgba(212,175,55,0.75)]",
          className,
        )}
      >
        {/* Hiệu ứng ánh sáng vàng kim lướt nhẹ định kỳ (periodic shimmer) */}
        <motion.span
          aria-hidden="true"
          initial={{ x: "-140%" }}
          animate={{ x: "240%" }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            repeatDelay: 2.8,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-gold-200/35 to-transparent"
        />

        <SpiritStoneIcon />
        <span className="relative z-10">{activeConfig.buttonText}</span>
      </motion.button>

      <DonateModal open={open} onClose={() => setOpen(false)} config={activeConfig} />
    </MotionConfig>
  );
}

/**
 * Icon Linh Thạch / Ngọc Bội Hoàng Kim cổ trang.
 */
function SpiritStoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="relative z-10 size-3.5 shrink-0 text-gold-200 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
    >
      <path
        d="M12 2.5L18.5 7.5L16 20.5H8L5.5 7.5L12 2.5Z"
        fill="rgba(212, 175, 55, 0.28)"
        stroke="#F6E7B0"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 2.5V20.5M5.5 7.5H18.5"
        stroke="#F6E7B0"
        strokeWidth="1.1"
        strokeOpacity="0.65"
      />
    </svg>
  );
}
