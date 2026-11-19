import { z } from "zod";
import { normalizeImageUrl } from "@/lib/image-hosts";
import { parseVideoUrl } from "@/lib/video/provider";

/**
 * Shared Zod schemas for the admin forms.
 *
 * Video URLs are validated through the provider layer, which enforces the
 * hostname allowlist and HTTPS-only rule. A raw iframe is never accepted.
 */

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug không được để trống.")
  .max(90, "Slug quá dài.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang.");

export const publicationStatusSchema = z.enum(["draft", "published"]);

export const releaseStatusSchema = z.enum(["upcoming", "airing", "completed"]);

export const subtitleLabelSchema = z.enum(["vietsub", "thuyet_minh", "raw"]);

export const videoProviderSchema = z.enum(["youtube", "facebook"]);

export const scheduleStatusSchema = z.enum(["scheduled", "aired", "postponed"]);

export const postTypeSchema = z.enum(["weekly_schedule", "movie_intro", "announcement"]);

/**
 * Schema cho một ô nhập số của form quản trị.
 *
 * Mọi `<input>` trong form HTML đều gửi giá trị dạng **chuỗi**, nên schema
 * phải tự ép kiểu trước khi kiểm tra khoảng giá trị. Nếu không, `z.number()`
 * sẽ từ chối "2024" và cả lần lưu bị từ chối — kể cả khi các trường khác
 * (ví dụ trạng thái xuất bản) đã hợp lệ.
 *
 * - Chuỗi rỗng / `undefined` nghĩa là "không nhập".
 * - Chuỗi không phải số được trả lại nguyên trạng để Zod báo lỗi bằng thông
 *   báo tiếng Việt thay vì "Invalid input".
 */
function toFormNumber(value: unknown): number | string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const parsed = Number(trimmed);
    // Không phải số: giữ nguyên giá trị để Zod báo lỗi.
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  return String(value);
}

interface FormNumberOptions {
  min: number;
  max: number;
  message: string;
}

/** Ô nhập số bắt buộc — kết quả là `number`. */
function requiredFormNumber({ min, max, message }: FormNumberOptions) {
  return z.preprocess(
    toFormNumber,
    z.number({ error: message }).int(message).min(min, message).max(max, message),
  );
}

/** Ô nhập số tuỳ chọn — để trống thì ra `null`. */
function optionalFormNumber({ min, max, message }: FormNumberOptions) {
  return z.preprocess(
    (value) => {
      const parsed = toFormNumber(value);
      return parsed === undefined ? null : parsed;
    },
    z.number({ error: message }).int(message).min(min, message).max(max, message).nullable(),
  );
}

/** Validates a video URL through the shared provider layer. */
export const videoUrlSchema = z
  .string()
  .trim()
  .min(1, "URL nguồn video không được để trống.")
  .superRefine((value, ctx) => {
    const result = parseVideoUrl(value);
    if (!result.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.hint ? `${result.error} ${result.hint}` : result.error,
      });
    }
  });

/**
 * URL ảnh: chấp nhận cả URL tuyệt đối (https://…) lẫn đường dẫn nội bộ
 * tương đối (/api/poster/…) mà seed/demo dùng.
 *
 * Đầu vào còn được **chuẩn hoá**: nếu quản trị viên dán URL của trang quản trị
 * Supabase (dạng `supabase.com/dashboard/project/<ref>/storage/files/...?preview=…`)
 * thì nó được chuyển thành URL file công khai thật
 * (`https://<ref>.supabase.co/storage/v1/object/public/media/…`).
 *
 * Đây là cái bẫy rất dễ mắc: link trên thanh địa chỉ của Supabase Dashboard
 * trông như link ảnh nhưng thực chất là một trang HTML. Nếu lưu nguyên, ảnh
 * không bao giờ hiện và `next/image` ném lỗi
 * "hostname supabase.com is not configured", làm sập cả trang.
 *
 * Trường hợp không chuyển được (thiếu tên file) thì báo lỗi rõ ràng thay vì
 * lưu một URL chắc chắn hỏng.
 */
const SUPABASE_DASHBOARD_HOST_PATTERN = /(?:^|\/\/)(?:app\.)?supabase\.com\//i;

/** Trả `true` khi URL vẫn trỏ tới trang quản trị Supabase (chưa chuyển được). */
function isUnresolvedSupabaseDashboardUrl(value: string): boolean {
  if (!SUPABASE_DASHBOARD_HOST_PATTERN.test(value)) return false;
  try {
    const url = new URL(value);
    return /^(?:app\.)?supabase\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

const DASHBOARD_URL_MESSAGE =
  "Đây là URL trang quản trị Supabase, không phải URL ảnh. Hãy dùng nút “Tải lên”, hoặc mở file trong Storage và copy “Public URL” dạng https://<project>.supabase.co/storage/v1/object/public/media/<tên-file>.";

const imageUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\/[^\s]*$/.test(value) || /^https:\/\/\S+$/i.test(value),
    "URL ảnh không hợp lệ.",
  )
  // Chuẩn hoá trước khi kiểm tra: link Dashboard hợp lệ (có tên file) được
  // chuyển thành link file thật nên đi tiếp bình thường.
  .transform((value) => normalizeImageUrl(value))
  .refine((value) => !isUnresolvedSupabaseDashboardUrl(value), DASHBOARD_URL_MESSAGE);

/**
 * URL ảnh tuỳ chọn dạng `https://…` (ảnh bìa bài viết, logo, ảnh OG).
 *
 * Dùng cùng phép chuẩn hoá như `imageUrlSchema` để link Dashboard cũng hoạt
 * động, nhưng vẫn giữ quy tắc "không truyền thì để trống".
 */
const optionalRemoteImageUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^https:\/\/\S+$/i.test(value),
    "URL ảnh không hợp lệ.",
  )
  .transform((value) => normalizeImageUrl(value))
  .refine((value) => !isUnresolvedSupabaseDashboardUrl(value), DASHBOARD_URL_MESSAGE);
/**
 * Schema cho form Thêm/Sửa phim.
 *
 * Form chỉ còn các thông tin người dùng thực sự cần: tên phim, tên gốc, nội
 * dung, thể loại và trạng thái. Số tập KHÔNG khai báo ở đây — danh sách tập
 * được suy ra từ chính các tập đã xuất bản trong "Quản lý tập".
 */
export const genreSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên thể loại không được để trống.")
    .max(100, "Tên thể loại quá dài."),
  slug: slugSchema,
  description: z.string().trim().max(500, "Mô tả quá dài.").optional().or(z.literal("")),
  sortOrder: optionalFormNumber({
    min: 0,
    max: 9999,
    message: "Thứ tự hiển thị phải là số nguyên từ 0 trở lên.",
  }),
});

export type GenreFormValues = z.input<typeof genreSchema>;
export type GenreFormOutput = z.output<typeof genreSchema>;

export const movieSchema = z.object({
  title: z.string().trim().min(1, "Tên phim không được để trống.").max(200),
  originalTitle: z.string().trim().max(200).optional().or(z.literal("")),
  slug: slugSchema,
  synopsis: z.string().trim().max(5000).optional().or(z.literal("")),
  posterUrl: imageUrlSchema,
  backdropUrl: imageUrlSchema,
  status: publicationStatusSchema,
  releaseStatus: releaseStatusSchema,
  genreIds: z.array(z.string()).default([]),
});

export type MovieFormValues = z.input<typeof movieSchema>;
export type MovieFormOutput = z.output<typeof movieSchema>;

export const episodeSourceSchema = z.object({
  id: z.string().optional(),
  provider: videoProviderSchema,
  sourceUrl: videoUrlSchema,
  label: z.string().trim().min(1, "Nhãn nguồn không được để trống.").max(120),
  priority: z.number().int().min(0).max(99),
});

export const episodeSchema = z.object({
  movieId: z.string().min(1, "Thiếu phim."),
  episodeNumber: requiredFormNumber({
    min: 1,
    max: 9999,
    message: "Số tập là bắt buộc và phải là số từ 1 trở lên.",
  }),
  title: z.string().trim().min(1, "Tên tập không được để trống.").max(200),
  slug: slugSchema,
  releaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phát hành không hợp lệ.")
    .optional()
    .or(z.literal("")),
  status: publicationStatusSchema,
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  sources: z.array(episodeSourceSchema).default([]),
});

export type EpisodeFormValues = z.input<typeof episodeSchema>;
export type EpisodeFormOutput = z.output<typeof episodeSchema>;

export const scheduleEventSchema = z.object({
  movieId: z.string().min(1, "Vui lòng chọn phim."),
  episodeId: z.string().optional().or(z.literal("")),
  episodeNumber: optionalFormNumber({
    min: 1,
    max: 9999,
    message: "Số tập dự kiến phải là số từ 1 trở lên.",
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Giờ không hợp lệ."),
  status: scheduleStatusSchema,
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ScheduleFormValues = z.input<typeof scheduleEventSchema>;

export const postSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống.").max(250),
  slug: slugSchema,
  excerpt: z.string().trim().max(600).optional().or(z.literal("")),
  content: z.string().trim().max(100_000).default(""),
  coverImageUrl: optionalRemoteImageUrlSchema,
  type: postTypeSchema,
  status: publicationStatusSchema,
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu tuần không hợp lệ.")
    .optional()
    .or(z.literal("")),
  movieIds: z.array(z.string()).default([]),
});

export type PostFormValues = z.input<typeof postSchema>;
export type PostFormOutput = z.output<typeof postSchema>;

export const settingsSchema = z.object({
  siteName: z.string().trim().min(1, "Tên website không được để trống.").max(120),
  siteDescription: z.string().trim().max(500).optional().or(z.literal("")),
  logoUrl: optionalRemoteImageUrlSchema,
  contactEmail: z
    .string()
    .trim()
    .email("Email liên hệ không hợp lệ.")
    .optional()
    .or(z.literal("")),
  contactNote: z.string().trim().max(500).optional().or(z.literal("")),
  seoTitle: z.string().trim().max(180).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
  ogImageUrl: optionalRemoteImageUrlSchema,
  featuredMovieId: z.string().optional().or(z.literal("")),
  donateButtonText: z.string().trim().max(80).optional().or(z.literal("")),
  donateTitle: z.string().trim().max(150).optional().or(z.literal("")),
  donateMessage: z.string().trim().max(1000).optional().or(z.literal("")),
  donateBankName: z.string().trim().max(120).optional().or(z.literal("")),
  donateAccountNumber: z.string().trim().max(80).optional().or(z.literal("")),
  donateAccountHolder: z.string().trim().max(150).optional().or(z.literal("")),
  donateTransferContent: z.string().trim().max(150).optional().or(z.literal("")),
  donateQrImageUrl: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type SettingsFormValues = z.input<typeof settingsSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

/** Flattens a Zod error into a `{ field: message }` map for the forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (path && !result[path]) result[path] = issue.message;
  }
  return result;
}