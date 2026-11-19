/**
 * Cấu hình tính năng Donate / Ủng Hộ (Thưởng Linh Thạch).
 *
 * Hỗ trợ chỉnh sửa trực tiếp trong trang Quản trị (/admin/cai-dat) lưu vào
 * cơ sở dữ liệu Supabase, đồng thời dùng DONATE_CONFIG làm giá trị mặc định.
 */

export interface DonateConfig {
  /** Tên hiển thị trên nút bấm cạnh nút Tắt đèn / Rạp Chiếu */
  buttonText: string;
  /** Tiêu đề hiển thị trong Popup Donate */
  title: string;
  /** Lời nhắn cảm ơn gửi tới người xem */
  message: string;
  /** Tên ngân hàng nhận (VD: "MB Bank", "Vietcombank", "Techcombank") */
  bankName: string;
  /** Số tài khoản nhận */
  accountNumber: string;
  /** Tên chủ tài khoản (viết hoa không dấu) */
  accountHolder: string;
  /** Nội dung chuyển khoản gợi ý */
  transferContent: string;
  /**
   * Đường dẫn ảnh mã QR tĩnh (ví dụ: "/qr-donate.png") hoặc link VietQR tự động:
   * Cú pháp VietQR: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact2.png?addInfo=<NOI_DUNG>&accountName=<TEN_CHU_TK>
   */
  qrImageUrl: string;
}

export const DONATE_CONFIG: DonateConfig = {
  buttonText: "Thưởng Linh Thạch",
  title: "Cảm Tạ Đạo Hữu Đã Ủng Hộ",
  message:
    "Mỗi viên Linh Thạch của đạo hữu là nguồn linh khí quý giá giúp Cổ Trang Các duy trì máy chủ và ra mắt tập mới nhanh hơn. Đa tạ đạo hữu!",
  bankName: "Vietcombank",
  accountNumber: "9896423546",
  accountHolder: "NGUYEN DINH HOANG HUY",
  transferContent: "UNG HO GHIEN PHIM",
  qrImageUrl:
    "https://img.vietqr.io/image/VCB-9896423546-compact2.png?addInfo=UNG%20HO%20GHIEN%20PHIM&accountName=NGUYEN%20DINH%20HOANG%20HUY",
};

export interface VietQrBankOption {
  code: string;
  name: string;
}

export const COMMON_VIETQR_BANKS: readonly VietQrBankOption[] = [
  { code: "MB", name: "MB Bank" },
  { code: "VCB", name: "Vietcombank" },
  { code: "TCB", name: "Techcombank" },
  { code: "ACB", name: "ACB" },
  { code: "BIDV", name: "BIDV" },
  { code: "ICB", name: "VietinBank" },
  { code: "VPB", name: "VPBank" },
  { code: "TPB", name: "TPBank" },
  { code: "VBA", name: "Agribank" },
  { code: "STB", name: "Sacombank" },
  { code: "VIB", name: "VIB" },
  { code: "HDB", name: "HDBank" },
  { code: "MSB", name: "MSB" },
  { code: "SHB", name: "SHB" },
  { code: "OCB", name: "OCB" },
] as const;

export function resolveBankCode(bankName: string): string {
  const normalized = bankName.trim().toLowerCase();
  const matched = COMMON_VIETQR_BANKS.find(
    (b) =>
      b.name.toLowerCase() === normalized ||
      b.code.toLowerCase() === normalized ||
      normalized.includes(b.name.toLowerCase()),
  );
  return matched?.code ?? "VCB";
}

/**
 * Tự động tạo link ảnh mã QR VietQR chuẩn theo mã ngân hàng + số tài khoản.
 */
export function buildVietQrImageUrl(params: {
  bankCode: string;
  accountNumber: string;
  accountHolder?: string;
  transferContent?: string;
}): string {
  const code = params.bankCode.trim() || "VCB";
  const acc = params.accountNumber.trim() || DONATE_CONFIG.accountNumber;
  const search = new URLSearchParams();
  if (params.transferContent?.trim()) {
    search.set("addInfo", params.transferContent.trim());
  }
  if (params.accountHolder?.trim()) {
    search.set("accountName", params.accountHolder.trim());
  }
  const qs = search.toString();
  return `https://img.vietqr.io/image/${encodeURIComponent(code)}-${encodeURIComponent(acc)}-compact2.png${qs ? `?${qs}` : ""}`;
}

const DONATE_MARKER_PREFIX = "<!--DONATE_JSON:";
const DONATE_MARKER_SUFFIX = "-->";

/**
 * Chuẩn hóa đối tượng DonateConfig, tự động điền giá trị mặc định từ DONATE_CONFIG
 * cho bất kỳ trường nào bị trống. Nếu qrImageUrl là link VietQR nhưng lệch STK mới,
 * tự động đồng bộ lại link VietQR theo STK và ngân hàng mới.
 */
export function normalizeDonateConfig(partial?: Partial<DonateConfig> | null): DonateConfig {
  if (!partial || typeof partial !== "object") {
    return { ...DONATE_CONFIG };
  }
  const bankName = partial.bankName?.trim() || DONATE_CONFIG.bankName;
  const accountNumber = partial.accountNumber?.trim() || DONATE_CONFIG.accountNumber;
  const accountHolder = partial.accountHolder?.trim() || DONATE_CONFIG.accountHolder;
  const transferContent = partial.transferContent?.trim() || DONATE_CONFIG.transferContent;
  let qrImageUrl = partial.qrImageUrl?.trim() || "";

  if (
    !qrImageUrl ||
    (qrImageUrl.includes("img.vietqr.io/image/") &&
      !qrImageUrl.includes(encodeURIComponent(accountNumber)))
  ) {
    qrImageUrl = buildVietQrImageUrl({
      bankCode: resolveBankCode(bankName),
      accountNumber,
      accountHolder,
      transferContent,
    });
  }

  return {
    buttonText: partial.buttonText?.trim() || DONATE_CONFIG.buttonText,
    title: partial.title?.trim() || DONATE_CONFIG.title,
    message: partial.message?.trim() || DONATE_CONFIG.message,
    bankName,
    accountNumber,
    accountHolder,
    transferContent,
    qrImageUrl,
  };
}

/**
 * Tách thông tin ghi chú liên hệ (contactNote) và cấu hình Donate (donateConfig)
 * từ chuỗi lưu trong cột `contact_note` của bảng `site_settings`.
 * Nhờ cơ chế này, Admin có thể lưu thông tin chuyển khoản vào Supabase ngay lập tức
 * mà không bắt buộc phải chạy thêm lệnh ALTER TABLE.
 */
export function parseContactNoteAndDonate(rawContactNote: string | null | undefined): {
  contactNote: string | null;
  donateConfig: DonateConfig;
} {
  if (!rawContactNote) {
    return {
      contactNote: null,
      donateConfig: { ...DONATE_CONFIG },
    };
  }

  const startIdx = rawContactNote.indexOf(DONATE_MARKER_PREFIX);
  if (startIdx === -1) {
    return {
      contactNote: rawContactNote,
      donateConfig: { ...DONATE_CONFIG },
    };
  }

  const cleanNote = rawContactNote.slice(0, startIdx).trim();
  const afterPrefix = rawContactNote.slice(startIdx + DONATE_MARKER_PREFIX.length);
  const endIdx = afterPrefix.indexOf(DONATE_MARKER_SUFFIX);
  const jsonPart = endIdx === -1 ? afterPrefix : afterPrefix.slice(0, endIdx);

  try {
    const parsed = JSON.parse(jsonPart) as Partial<DonateConfig>;
    return {
      contactNote: cleanNote.length > 0 ? cleanNote : null,
      donateConfig: normalizeDonateConfig(parsed),
    };
  } catch {
    return {
      contactNote: cleanNote.length > 0 ? cleanNote : null,
      donateConfig: { ...DONATE_CONFIG },
    };
  }
}

/**
 * Đóng gói ghi chú liên hệ (contactNote) kèm cấu hình Donate (donateConfig)
 * để lưu an toàn vào cột `contact_note` của bảng `site_settings`.
 */
export function serializeContactNoteWithDonate(
  contactNote: string | null | undefined,
  donateConfig?: Partial<DonateConfig> | null,
): string | null {
  const cleanNote = (contactNote ?? "")
    .replace(/<!--DONATE_JSON:[\s\S]*?-->/g, "")
    .trim();

  if (!donateConfig) {
    return cleanNote.length > 0 ? cleanNote : null;
  }

  const normalized = normalizeDonateConfig(donateConfig);
  const marker = `${DONATE_MARKER_PREFIX}${JSON.stringify(normalized)}${DONATE_MARKER_SUFFIX}`;
  return cleanNote.length > 0 ? `${cleanNote}\n${marker}` : marker;
}
