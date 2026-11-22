# Design System — Ghiền Phim (Đêm Đèn Lồng Giấy Gió)

<!-- impeccable:design-schema 1 -->

## Visual World

**Đêm Đèn Lồng Giấy Gió (Lantern-Lit Courtyard Night)** — Nền đêm chàm tĩnh lặng (`#0D1321`) làm phông nền cho poster phim và trình phát video; ánh sáng hổ phách ấm (`#F4B860`) chỉ xuất hiện ở viền trạng thái đang phát, CTA chính và lịch chiếu hôm nay, giữ phần chữ hoàn toàn trung tính và sắc nét.

## Color Tokens

| Role | Token | Hex | Usage |
| --- | --- | --- | --- |
| Background (Ground) | `--background` / `ink-900` | `#0D1321` | Nền trang chính |
| Sunken Surface | `--surface-sunken` / `ink-950` | `#080C16` | Header/footer tối sâu, scrollbar track |
| Card / Surface | `--surface` / `ink-800` | `#151E32` | Thẻ phim, lịch chiếu, panel |
| Raised Surface | `--surface-raised` / `ink-750` | `#1C2742` | Trạng thái hover, popover |
| Border (Hairline) | `--border` / `ink-700` | `#24324D` | Viền mảnh mặc định |
| Border (Strong) | `--border-strong` / `ink-600` | `#334568` | Viền phân tách rõ |
| Primary Text | `--foreground` / `parchment-100` | `#F5EFE6` | Tiêu đề và nội dung chính |
| Muted Text | `--muted` / `mist-400` | `#A4B1C6` | Metadata, mô tả phụ (WCAG AA+) |
| Accent (Lantern Amber) | `--accent` / `gold-400` | `#F4B860` | CTA chính, focus ring, viền active |
| Accent Hover | `--accent-soft` / `gold-300` | `#F8CA82` | Hover trên CTA / link nổi bật |
| Cinnabar (Live / Error) | `--rouge` / `rouge-500` | `#C84B31` | Nhãn tập mới, lỗi, cảnh báo |
| Jade (Aired / Success) | `--jade` / `jade-500` | `#3FA384` | Trạng thái đã lên sóng, hoàn tất |

## Typography & Numeric Discipline

- **Display / Headings:** `Cormorant Garamond` (`--font-serif`, weights 600, 700), `letter-spacing: -0.01em`.
- **Body / UI:** `Be Vietnam Pro` (`--font-sans`, weights 400–700), tối thiểu 12px cho chữ có dấu tiếng Việt.
- **Numeric Columns:** Bắt buộc dùng `tabular-nums` cho số tập (`Tập 12/24`), giờ chiếu (`20:00`), ngày tháng và số liệu KPI trong Admin.

## Motion & Accessibility

- Tôn trọng `prefers-reduced-motion` trên mọi `<MotionConfig reducedMotion="user">` và CSS transitions.
- Focus indicator: `2px solid #F4B860` (`outline-offset: 2px`), không bao giờ xóa focus ring mà không có thay thế.
- Không dùng `text-ink-500`/`text-ink-600` hay `text-parchment-*` opacity dưới `70%` làm màu chữ.
