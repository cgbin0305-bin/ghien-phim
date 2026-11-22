# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary audience:** Khán giả Việt Nam yêu thích dòng phim cổ trang, tiên hiệp, kiếm hiệp, cung đấu Trung Quốc, thường xem giải trí trên cả mobile và desktop vào buổi tối hoặc cuối tuần.
- **Secondary users (Operators):** Quản trị viên (Admin) vận hành nội dung: thêm/sửa phim, quản lý tập phim, cập nhật lịch chiếu, đăng bài viết/review và theo dõi số liệu phân tích.

## Product Purpose

Cung cấp nền tảng xem phim Hoa ngữ/cổ trang kèm phụ đề tiếng Việt mượt mà, giúp khán giả dễ dàng khám phá phim mới, theo dõi lịch chiếu tập mới, đọc bài viết/review và thảo luận cùng cộng đồng, đồng thời trang bị cho admin bộ công cụ quản trị nội dung tập trung.

## Positioning

Trải nghiệm xem phim chuyên sâu cho dòng phim Hoa ngữ & cổ trang tại Việt Nam — kết hợp trình phát video mượt mà, lịch chiếu tập mới rõ ràng, bài viết biên tập và thảo luận cộng đồng trong cùng một không gian thống nhất.

## Operating Context

- **Public web app:** `/` (Trang chủ), `/phim` (Danh sách & lọc phim), `/phim/[slug]` (Chi tiết phim), `/xem/[movieSlug]/[episodeSlug]` (Trình phát video & chuyển tập), `/lich-chieu` (Lịch chiếu theo ngày), `/bai-viet` & `/bai-viet/[slug]` (Bài viết/review).
- **Admin panel:** `/admin/login`, `/admin` (Tổng quan), `/admin/phim`, `/admin/phim/[id]/episodes`, `/admin/the-loai`, `/admin/lich-chieu`, `/admin/bai-viet`, `/admin/phan-tich`, `/admin/cai-dat`.
- **Tech stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4, Radix UI, Framer Motion, Lucide React, Supabase (`@supabase/ssr`, `@supabase/supabase-js`).

## Capabilities and Constraints

- Giữ nguyên toàn bộ luồng tính năng hiện có: Xem phim, Lịch chiếu, Bài viết, Bình luận cộng đồng, Admin Panel.
- Giao diện hỗ trợ tiếng Việt đầy đủ (`lang="vi"`), hoạt động tốt trên cả Mobile Web và Desktop.
- Tôn trọng cấu hình demo mode (`isDemoMode`) và dữ liệu động từ Supabase/store.

## Brand Commitments

- Giữ tên thương hiệu và domain tiếng Việt (`Ghiền Phim` / `gheien-phim`).

## Evidence on Hand

- Existing Next.js codebase under `src/app/` and `src/components/`, with unit/component tests under `src/__tests__/` (Vitest + Testing Library).
- Existing metadata and SEO copy in `src/app/layout.tsx` and store layer in `src/lib/data/`.

## Product Principles

1. **Xem phim là trung tâm:** Mọi luồng điều hướng công khai đều dẫn nhanh, ít ma sát tới việc chọn tập và phát video ổn định.
2. **Nhịp điệu theo dõi tập mới:** Lịch chiếu và trạng thái tập mới phải rõ ràng, dễ quét trên cả màn hình nhỏ lẫn desktop.
3. **Cộng đồng & biên tập gắn liền:** Bài viết, review và bình luận bổ trợ cho việc khám phá phim mà không làm rối trình phát.
4. **Admin hiệu quả, rõ ràng:** Khu vực quản trị ưu tiên khả năng quét dữ liệu nhanh, thao tác chính xác và phân tách rành mạch với trải nghiệm khán giả.

## Accessibility & Inclusion

- Đáp ứng điều hướng bàn phím (keyboard navigation, skip-to-content link, visible focus states) và độ tương phản chữ tối thiểu đạt chuẩn WCAG AA (4.5:1) trên cả giao diện công khai lẫn admin.
