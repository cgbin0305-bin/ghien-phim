# Ghiền Phim

Website xem phim cổ trang Trung Hoại với giao diện tiếng Việt, xây dựng trên **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS v4** và **Supabase**.

Ghiền Phim **không upload, không lưu trữ và không proxy video**. Toàn bộ nội dung được phát bằng cơ chế nhúng chính thức của YouTube và Facebook, và chỉ dùng cho nội dung mà chủ website có quyền sử dụng.

---

## Mục lục

1. [Tính năng](#tính-năng)
2. [Công nghệ](#công-nghệ)
3. [Chạy local](#chạy-local)
4. [Cấu hình Supabase](#cấu-hình-supabase)
5. [Tạo tài khoản admin đầu tiên](#tạo-tài-khoản-admin-đầu-tiên)
6. [Chạy production với dữ liệu thật (không seed)](#chạy-production-với-dữ-liệu-thật-không-seed)
7. [Cấu hình Auth URL và redirect URL](#cấu-hình-auth-url-và-redirect-url)
8. [Deploy lên Vercel](#deploy-lên-vercel)
9. [Thêm phim, tập, nguồn video, lịch và bài viết](#thêm-phim-tập-nguồn-video-lịch-và-bài-viết)
10. [Kiến trúc](#kiến-trúc)
11. [Bảo mật](#bảo-mật)
12. [Giới hạn của YouTube/Facebook embed](#giới-hạn-của-youtubefacebook-embed)
13. [Giả định quan trọng](#giả-định-quan-trọng)
14. [Kiểm thử](#kiểm-thử)
15. [Các bước cần cấu hình bên ngoài và phần chưa xác minh](#các-bước-cần-cấu-hình-bên-ngoài-và-phần-chưa-xác-minh)

---

## Tính năng

### Trang công khai

| Route | Nội dung |
| --- | --- |
| `/` | Hero phim nổi bật, phim mới, phim cổ trang nổi bật, tiên hiệp/kiếm hiệp/cung đấu, lịch chiếu hôm nay, bài viết mới, "Tiếp tục xem" (chỉ khi có dữ liệu `localStorage`) |
| `/phim` | Tìm kiếm theo tên Việt/tên gốc, lọc theo thể loại/năm/trạng thái, sắp xếp, phân trang — tất cả đồng bộ vào URL |
| `/phim/[slug]` | Backdrop, poster, tóm tắt, metadata (đạo diễn, diễn viên, năm, quốc gia, phụ đề), danh sách tập, lịch sắp tới, phim liên quan, JSON-LD `TVSeries` |
| `/xem/[movieSlug]/[episodeSlug]` | Player 16:9 responsive, đổi nguồn, tập trước/sau, sidebar tập, chế độ "Tắt đèn", mở rộng vùng xem, link mở video gốc |
| `/lich-chieu` | Lịch tuần Thứ hai → Chủ nhật theo `Asia/Ho_Chi_Minh`, điều hướng tuần, làm nổi bật hôm nay, bài viết lịch chiếu tuần |
| `/bai-viet`, `/bai-viet/[slug]` | Danh sách và chi tiết bài viết (lịch chiếu tuần / giới thiệu phim / thông báo), Markdown đã sanitize |

### Khu vực quản trị

| Route | Chức năng |
| --- | --- |
| `/admin/login` | Đăng nhập bằng Supabase Auth |
| `/admin` | Dashboard: số phim, số tập, số bài viết, lịch sắp tới — lấy từ dữ liệu thật |
| `/admin/phim` | Bảng phim, tìm kiếm, lọc, đặt phim nổi bật, xoá có xác nhận |
| `/admin/phim/new`, `/admin/phim/[id]/edit` | Form phim: slug tự gợi ý, thể loại, metadata, ảnh, trạng thái xuất bản ↔ trạng thái phát hành |
| `/admin/phim/[id]/episodes` | Quản lý tập + nhiều nguồn video, xem trước trước khi lưu |
| `/admin/lich-chieu` | CRUD lịch, tạo nhanh theo nhiều ngày trong tuần, nhân bản tuần (có xem trước) |
| `/admin/bai-viet`, `/admin/bai-viet/new`, `/admin/bai-viet/[id]/edit` | Editor Markdown với xem trước trực tiếp, phim liên quan, ngày bắt đầu tuần |
| `/admin/cai-dat` | Tên website, liên hệ, metadata SEO, phim nổi bật |

---

## Công nghệ

| Lớp | Lựa chọn |
| --- | --- |
| Framework | Next.js `15.5.29` (App Router, Server Components) |
| UI | React `19.1.1`, Tailwind CSS `4.1.13`, Radix UI primitives, `lucide-react` |
| Form | React Hook Form `7.62.0` + Zod `4.1.5` |
| Data | Supabase PostgreSQL + Auth + Storage, `@supabase/ssr` `0.7.0` |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-sanitize` |
| Test | Vitest `3.2.4` |

Tất cả đều là phiên bản **stable**, không dùng prerelease.

---

## Chạy local

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Mở <http://localhost:3000>.

**Không cần Supabase để chạy giao diện.** Nếu `NEXT_PUBLIC_SUPABASE_URL` hoặc `NEXT_PUBLIC_SUPABASE_ANON_KEY` còn trống, ứng dụng chạy ở **chế độ demo**:

- Dữ liệu minh hoạ nằm trong bộ nhớ (`src/lib/data/demo.ts`): 8 phim hư cấu, 32 tập, lịch phủ 7 ngày, 3 bài viết.
- Một banner rõ ràng hiển thị ở đầu trang và trong khu vực quản trị.
- **Mọi thao tác ghi sẽ bị từ chối kèm thông báo lỗi** — ứng dụng không giả vờ lưu thành công.
- Demo data không bao giờ được ghi vào bảng production.

Lệnh khác:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest run
npm run build       # next build
```

---

## Cấu hình Supabase

1. Tạo project tại <https://supabase.com/dashboard>.
2. Vào **Project Settings → API** để lấy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (chỉ dùng ở server, không có tiền tố `NEXT_PUBLIC`)
3. Điền các biến vào `.env.local`.
4. Chạy migration. Có ba cách:

   **a. Supabase CLI (khuyến nghị)**

   ```bash
   npm install -g supabase

   # `supabase link` cần Personal Access Token (PAT).
   # Lấy ở Supabase Dashboard → Account Preferences → Personal Access Tokens.
   # Đặt vào biến môi trường của shell — KHÔNG ghi vào .env.example:
   #   PowerShell:  $env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"
   #   bash/zsh:    export SUPABASE_ACCESS_TOKEN="sbp_xxx"

   supabase link --project-ref <YOUR_PROJECT_REF>
   supabase db push          # áp dụng 001, 002, 003 (KHÔNG nạp seed)
   supabase db reset --local # reset + seed (chỉ local)
   ```

   **b. SQL Editor trên dashboard**

   Chạy lần lượt, theo đúng thứ tự:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_storage.sql`
   - `supabase/seed.sql` — **tuỳ chọn, CHỈ dành cho local** (dữ liệu minh hoạ)

   **c. psql**

   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/001_initial_schema.sql
   psql "$DATABASE_URL" -f supabase/migrations/002_rls_policies.sql
   psql "$DATABASE_URL" -f supabase/migrations/003_storage.sql
   psql "$DATABASE_URL" -f supabase/seed.sql   # chỉ local
   ```

Sau khi có credentials và migration, ứng dụng **tự động chuyển sang dữ liệu thật** — không cần sửa code. Banner demo biến mất.

---

## Tạo tài khoản admin đầu tiên

Không có đăng ký admin công khai. Quy trình bootstrap an toàn, **không hardcode mật khẩu**:

**Bước 1 — Tạo user trong Supabase Dashboard**

Vào **Authentication → Users → Add user → Create a new user**:

- Email: email của bạn
- Password: bạn tự đặt (đủ mạnh)
- **Bật "Auto Confirm User"** để không cần xác nhận email.

**Bước 2 — Gán vai trò admin**

Cách nhanh nhất là dùng script có sẵn (đọc tự động `.env.local`):

```bash
npm run db:bootstrap-admin -- your-admin@example.com
# hoặc kèm mật khẩu cụ thể:
npm run db:bootstrap-admin -- your-admin@example.com --password "MatKhauCuaBan"
```

Script sẽ:

1. Tìm user trong Supabase Auth (hoặc tạo mới nếu chưa có — khi đó in ra mật khẩu ngẫu nhiên).
2. Upsert dòng `public.profiles` tương ứng với `role = 'admin'`.

> **Vì sao bước này là bắt buộc?** Bảng `public.profiles` quyết định ai được vào `/admin`. Nó **không** có trigger tự sinh khi đăng ký, và RLS chặn người dùng thường tự tạo dòng. Thiếu dòng này thì đăng nhập đúng mật khẩu vẫn bị đá về `/admin/login` với thông báo *"Tài khoản này không có quyền quản trị."*

**Bước 2' — Cách làm thủ công (SQL Editor)**

```sql
insert into public.profiles (id, email, display_name, role)
select id, email, raw_user_meta_data->>'full_name', 'admin'
from auth.users
where email = 'your-admin@example.com'
on conflict (id) do update
  set role = 'admin', updated_at = now();
```

`public.profiles` **không có** policy INSERT/UPDATE cho người dùng thường — chỉ `is_admin()` mới được ghi. Vì vậy người dùng không thể tự cấp quyền admin.

**Bước 3 — Đăng nhập**

Mở `/admin/login` và đăng nhập bằng tài khoản trên.

---

## Chạy production với dữ liệu thật (không seed)

App tự chuyển sang đọc PostgreSQL thật ngay khi `.env.local` có:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Không có `DEMO_*` flag nào — chỉ cần hai biến trên là `hasSupabaseConfig` chuyển sang `true` và `demoStore` (dữ liệu minh hoạ trong bộ nhớ) **không bao giờ** được dùng.

### Về seed data

`supabase/seed.sql` **chỉ dành cho local**. `supabase/config.toml` đã đặt `[db.seed] enabled = false` để `supabase db reset` không tự nạp lại dữ liệu minh hoạ lên production — `db reset` xoá toàn bộ dữ liệu rồi nạp lại, nên nếu seed bật thì mọi phim bạn đã nhập sẽ bị thay bằng 8 phim hư cấu.

```bash
supabase db push                # ✅ an toàn trên production (chỉ áp dụng migration)
supabase db reset --local       # ⚠️ chỉ local, KHÔNG dùng trên production
psql "$DATABASE_URL" -f supabase/seed.sql   # ⚠️ chỉ local — nạp dữ liệu minh hoạ
```

### Thứ tự triển khai lên production

```bash
# 1. Nạp schema (không seed)
supabase link --project-ref <REF>
supabase db push

# 2. Tạo tài khoản admin
npm run db:bootstrap-admin -- admin@example.com --password "..."

# 3. Nạp thể loại (bảng `genres` rỗng thì form phim sẽ không có gì để tick)
#    Chạy 1 lần trong SQL Editor:
insert into public.genres (name, slug, sort_order) values
  ('Cổ trang', 'co-trang', 1),
  ('Tiên hiệp', 'tien-hiem', 2),
  ('Kiếm hiệp', 'kiem-hiep', 3),
  ('Cung đấu', 'cung-dau', 4),
  ('Huyền huyễn', 'huyen-huyen', 5),
  ('Tình hoán', 'tinh-hoang', 6),
  ('Văn cổ', 'van-co', 7)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

# 4. Build & chạy
npm run build
npm run start
```

Sau đó vào `/admin` và tự thêm phim, tập, lịch chiếu, bài viết.

### Cache và dữ liệu sửa ngoài ứng dụng

Ứng dụng cache dữ liệu công khai ở hai tầng: Data Cache của Next.js (`revalidate: 300`) và cache TTL trong bộ nhớ. Khi quản trị viên sửa nội dung **qua giao diện**, các Server Action gọi `invalidatePublicCache()` nên thay đổi hiện ngay.

Nhưng nếu bạn sửa dữ liệu **trực tiếp bằng SQL** trong Supabase Dashboard, ứng dụng không biết nên vẫn phục vụ dữ liệu cũ tối đa **5 phút**. Cách xử lý:

```bash
# Xoá cache Data Cache của Next.js (rẻ nhất, không cần build lại)
rm -rf .next/cache

# Hoặc nếu dữ liệu cũ vẫn hiện sau khi deploy
rm -rf .next && npm run build
```

---

## Cấu hình Auth URL và redirect URL

Trong **Supabase Dashboard → Authentication → URL Configuration**:

| Mục | Giá trị |
| --- | --- |
| Site URL | `http://localhost:3111` (local) hoặc `https://<your-domain>.vercel.app` (production) |
| Redirect URLs | `http://localhost:3111/**`, `https://<your-domain>.vercel.app/**` |

Dùng `**` để hỗ trợ mọi path trong khu vực quản trị.

Trong **Authentication → Providers → Email**:
- Bật **Email provider**.
- Nếu chưa có SMTP, giữ nguyên "Confirm email" (Supabase gửi email qua dịch vụ mặc định, có giới hạn rate).
- Với production nhiều người dùng, nên cấu hình SMTP tùy chỉnh.

---

## Deploy lên Vercel

1. Đẩy code lên GitHub/GitLab/Bitbucket.
2. Vào <https://vercel.com/new> → import repository.
3. Thêm **Environment Variables**:

   | Key | Value | Environment |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL project | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | service role key | Production (server only) |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>.vercel.app` | Production |

4. Framework preset: **Next.js** (tự động detect). Build command `npm run build`, output `.next` — không cần đổi.
5. Deploy. Sau đó cập nhật lại **Site URL** và **Redirect URLs** trong Supabase theo domain thật.
6. Nếu dùng domain riêng, thêm domain trong Vercel rồi khai báo `NEXT_PUBLIC_SITE_URL` tương ứng.

**Lưu ý:** dự án KHÔNG dùng `output: "export"`. Server Actions, cookies và Auth cần một server runtime.

---

## Thêm phim, tập, nguồn video, lịch và bài viết

### Thêm phim

`/admin/phim` → **Thêm phim**.

- Nhập tên phim → slug tự gợi ý, có thể sửa tay (phải là chữ thường/số/gạch ngang).
- Tick các thể loại.
- **Trạng thái xuất bản** (`draft` / `published`) độc lập với **trạng thái phát hành** (`sắp chiếu` / `đang chiếu` / `hoàn thành`). Một phim đã xuất bản nhưng chưa có tập sẽ hiện trạng thái "sắp chiếu" ở trang công khai.
- Tick **Phim nổi bật** để đưa lên hero trang chủ (chỉ một phim tại một thời điểm).

### Thêm tập và nguồn video

`/admin/phim` → chọn phim → icon **Tập** → **Thêm tập**.

- Số tập phải **duy nhất trong phim** (đã có unique constraint ở DB).
- Thêm tối thiểu một nguồn video. Nhấn **Xem trước** để kiểm tra trước khi lưu.
- Nhập **URL**, không dán mã HTML/iframe. Hệ thống tự sinh khung nhúng chính thức.
- Có thể thêm nhiều nguồn cho một tập (dùng để dự phòng). Nguồn có `priority` cao hơn được thử trước.
- Tập chỉ được **xuất bản** khi có ít nhất một nguồn hợp lệ.

URL được hỗ trợ:

| Provider | Định dạng |
| --- | --- |
| YouTube | `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID`, `youtube.com/embed/ID`, `youtube-nocookie.com/embed/ID` |
| Facebook | `facebook.com/watch/?v=<id số>`, `facebook.com/plugins/video.php?href=<link>`, `facebook.com/reel/...` |

### Quản lý lịch chiếu

`/admin/lich-chieu`.

- **Một sự kiện**: chọn phim, tập (nếu có), ngày, giờ, trạng thái, ghi chú.
- **Nhiều ngày**: chọn các ngày trong tuần (T2 → CN) và một giờ cố định — hệ thống tạo một sự kiện cho mỗi ngày. Ngày đã có sự kiện trùng giờ sẽ được báo và bỏ qua.
- **Nhân bản tuần**: chọn tuần nguồn và tuần đích, bấm **Xem trước** để xem sẽ tạo bao nhiêu sự kiện (bao gồm cả số sự kiện trùng sẽ bị bỏ qua), rồi tick xác nhận và lưu.

Mọi giờ nhập và hiển thị theo **Asia/Ho_Chi_Minh**. Tuần được tính từ **Thứ hai**.

### Quản lý bài viết

`/admin/bai-viet` → **Viết bài**.

- Editor Markdown với tab **Soạn thảo / Xem trước**. Xem trước dùng đúng pipeline sanitize như trang công khai.
- Loại bài: `Lịch chiếu tuần` (kèm ngày bắt đầu tuần), `Giới thiệu phim`, `Thông báo`.
- Chọn phim liên quan (nhiều phim được).
- Nội dung được render bằng `react-markdown` + `rehype-sanitize` với whitelist thẻ và protocol. Mọi thẻ HTML thô, script, `on*` handler và URL `javascript:` đều bị loại bỏ.

---

## Kiến trúc

```
src/
├─ app/
│  ├─ page.tsx                      # Trang chủ
│  ├─ phim/                         # Danh sách + chi tiết phim
│  ├─ xem/[movieSlug]/[episodeSlug] # Trang xem
│  ├─ lich-chieu/                   # Lịch tuần
│  ├─ bai-viet/                     # Bài viết
│  ├─ admin/
│  │  ├─ login/                     # Ngoài route group -> không bị guard
│  │  └─ (panel)/                   # Route group có guard server-side
│  │     ├─ phim/ actions.ts        # Server Actions cho phim
│  │     ├─ phim/ episodes-actions.ts
│  │     ├─ lich-chieu/actions.ts
│  │     ├─ bai-viet/actions.ts
│  │     └─ cai-dat/actions.ts
│  ├─ api/poster/[id]/route.ts      # Poster SVG sinh tại chỗ (demo)
│  ├─ sitemap.ts, robots.ts
│  └─ middleware.ts                 # Refresh session cookie
├─ components/
│  ├─ ui/                           # Button, Input, Select, Dialog, Badge...
│  ├─ movie/, player/, layout/
│  └─ admin/                        # Form, bảng, preview, confirm dialog
└─ lib/
   ├─ auth.ts                       # getAdminSession / requireAdmin
   ├─ env.ts                        # Phát hiện demo vs supabase
   ├─ types.ts                      # Domain model
   ├─ data/
   │  ├─ types.ts                   # interface DataStore
   │  ├─ demo.ts / demo-store.ts    # In-memory store
   │  ├─ supabase-store.ts          # Postgres store
   │  └─ index.ts                   # getStore() dispatch
   ├─ date.ts                       # Múi giờ Asia/Ho_Chi_Minh
   ├─ slug.ts                       # Slugify tiếng Việt
   ├─ video/provider.ts             # Allowlist + sinh embed URL
   └─ validations/schemas.ts        # Zod schemas
```

### Lớp dữ liệu kép

Toàn bộ trang và Server Action chỉ nói chuyện với interface `DataStore`:

```ts
interface DataStore {
  mode: "demo" | "supabase";
  listMovies(filters: MovieFilters): Promise<MovieListResult>;
  getMovieBySlug(slug: string): Promise<MovieWithStats | null>;
  createMovie(input: MovieInput): Promise<Movie>;
  // ...
}
```

- `createDemoStore()` — dữ liệu trong bộ nhớ, khởi tạo từ `demo.ts`.
- `createSupabaseStore()` — truy vấn PostgreSQL trực tiếp với typed hydration.

`getStore()` chọn implementation dựa trên `hasSupabaseConfig`. Server Actions luôn kiểm tra `isDemoMode` và **trả về lỗi thay vì báo thành công giả**.

### Múi giờ

Mọi thời gian lưu dưới dạng `timestamptz` (instant tuyệt đối). Tuần lịch được tính theo lịch Việt Nam:

```ts
getWeekUtcRange("2026-01-05")
// { startIso: "2026-01-04T17:00:00.000Z", endIso: "2026-01-11T17:00:00.000Z" }
```

Ranh giới tuần neo vào **00:00 giờ Việt Nam** (Thứ hai), không phải 00:00 UTC — nếu neo theo UTC, các sự kiện lúc 00:00–07:00 sẽ bị rơi ra ngoài tuần.

---

## Bảo mật

| Lớp | Cơ chế |
| --- | --- |
| Xác thực | Supabase Auth, cookie-based qua `@supabase/ssr`. Middleware refresh session; `getAdminSession()` kiểm tra `public.profiles.role === 'admin'` |
| Guard trang | `src/app/admin/(panel)/layout.tsx` redirect `/admin/login` nếu không có session admin. `/admin/login` nằm ngoài route group nên vẫn truy cập được |
| Guard hành động | **Mọi** Server Action gọi `requireAdmin()` ở dòng đầu. UI chỉ là lớp trình bày, không phải lớp bảo vệ |
| Database | RLS bật trên tất cả bảng. `anon` chỉ đọc nội dung đã xuất bản; chỉ `is_admin()` được ghi |
| Điều kiện công khai | Một tập chỉ công khai khi **cả tập và phim cha đều `published`** (enforce bằng RLS, không chỉ ở tầng ứng dụng) |
| Tự cấp quyền | `profiles` không có policy INSERT/UPDATE cho user thường → không thể tự đặt `role = 'admin'` |
| Video | `parseVideoUrl()` dùng WHATWG URL parser + so khớp hostname **chính xác**. Từ chối `http:`, `javascript:`, `data:`, hostname giả mạo. Không bao giờ dùng chuỗi admin nhập làm `src` iframe |
| Storage | Bucket `media`, giới hạn 5 MB, chỉ `jpeg/png/webp/avif`, **từ chối SVG**. Policy: chỉ admin upload/update/delete |
| Markdown | `rehype-sanitize` với whitelist thẻ + protocol. Không `dangerouslySetInnerHTML` |
| Headers | `nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, HSTS, và CSP với `frame-src` giới hạn đúng YouTube + Facebook. `unsafe-eval` **chỉ** được cấp ở `next dev` (React Fast Refresh cần nó); bản production không cấp |
| Secrets | `SUPABASE_SERVICE_ROLE_KEY` chỉ ở server, không có `NEXT_PUBLIC`. Không ghi token/mật khẩu vào log. Không có UI chỉnh sửa biến môi trường |

### Chính sách URL video

```ts
parseVideoUrl("https://youtube.com.evil.test/watch?v=aqz-KE-bpKQ")
// -> { ok: false, error: "Nguồn video không được hỗ trợ (hostname: youtube.com.evil.test)." }
```

Hostname được so khớp bằng `Set.has()` — **không** dùng `.includes()` hay `.endsWith()` trên chuỗi chứa domain (trừ `*.youtube-nocookie.com`, là subdomain hợp lệ của YouTube). Kiểm tra này được cover bằng test tại `tests/provider.test.ts`.

---

## Giới hạn của YouTube/Facebook embed

**YouTube**

- Video phải **công khai** hoặc được chủ video cho phép nhúng. Video nhúng giới hạn hiển thị "Watch on YouTube".
- Không có autoplay có âm thanh — ứng dụng dùng `youtube-nocookie.com/embed` với `rel=0`, `modestbranding=1`, `playsinline=1` và **không** có `autoplay=1`.
- Không đọc được trạng thái phát bên trong iframe (cross-origin). Vì vậy ứng dụng **không** lưu timestamp và **không** tự chuyển tập khi video kết thúc. Tính năng "Tiếp tục xem" chỉ lưu tập đã mở và thời điểm truy cập trong `localStorage`.
- Không thể phát hiện mọi lỗi bên trong iframe. Vì vậy luôn có nút **"Mở trên YouTube"** và hướng dẫn đổi nguồn.

**Facebook**

- Dùng **Embedded Video Player chính thức**: `facebook.com/plugins/video.php?href=...`.
- Video phải **công khai** và **cho phép nhúng**. Video riêng tư hoặc bị hạn chế sẽ không phát.
- Cần link dạng `.../watch/?v=<id số>`, `.../reel/...` hoặc link plugin. Link `/share/...` **không** chuẩn hóa được và bị từ chối kèm hướng dẫn — ứng dụng không đoán ID.
- Facebook đôi khi yêu cầu đăng nhập để xem; không thể bypass và ứng dụng không cố.

**Chung**

- Ứng dụng **không** tải về, **không** proxy, **không** scrape và **không** vượt giới hạn của nền tảng.
- Nội dung demo dùng phim mở của Blender Foundation (CC BY 3.0) làm trình phát hợp pháp.

---

## Giả định quan trọng

1. **Chỉ admin cần tài khoản.** Khách truy cập không đăng nhập. Phiên bản đầu không có đăng ký công khai.
2. **Phim = một series.** Một phim có nhiều tập; mỗi tập có nhiều nguồn video. Chưa hỗ trợ phim lẻ (movie) một tập — mô hình hiện tại vẫn xử lý được (một tập).
3. **Trạng thái xuất bản ≠ trạng thái phát hành.** `draft/published` kiểm soát hiển thị công khai; `sắp chiếu/đang chiếu/hoàn thành` là thông tin nội dung. Một phim `published` + `sắp chiếu` + 0 tập là trạng thái hợp lệ.
4. **Xoá là xoá thật (cascade).** Khi xoá phim sẽ xoá luôn tập, nguồn video và sự kiện lịch. Giao diện luôn hiện hậu quả và khuyến nghị **chuyển về bản nháp** thay vì xoá hàng loạt.
5. **Lịch không có recurrence engine.** Lịch tuần được tạo thủ công hoặc bằng công cụ "nhiều ngày" / "nhân bản tuần". Không có cron.
6. **Lịch không khóa theo tuần.** Sự kiện có thể tồn tại ngoài tuần hiện tại; trang `/lich-chieu` chỉ hiển thị tuần đang xem.
7. **Poster dùng khổ ngang 16:9.** Mọi khung ảnh phim (card trong danh sách, poster ở trang chi tiết, thumbnail lịch chiếu, khối phim liên quan) đều dùng `aspect-video`. Ảnh được tải lên qua nút “Tải lên” trong form phim (bucket `media`, chỉ admin ghi). Nếu admin dán nhầm **URL trang quản trị** Supabase (`supabase.com/dashboard/...?preview=...`), `normalizeImageUrl` trong `src/lib/image-hosts.ts` tự chuyển thành URL file công khai `https://<ref>.supabase.co/storage/v1/object/public/media/<tên-file>` — nếu không, `next/image` sẽ ném `Invalid src prop ... hostname "supabase.com" is not configured` và làm sập cả trang.
8. **`/api/poster/[id]`** chỉ phục vụ poster SVG sinh tại chỗ cho dữ liệu demo. Định dạng đường dẫn là `/api/poster/<hue>-<motif>-<slug>` (ví dụ `/api/poster/205-kiem-van-kiem-lam-ngo`) — màu và hoa văn nằm trong *path* chứ không phải query string, vì Next.js so khớp `images.localPatterns` với một chuỗi `search` chính xác. Ở chế độ Supabase, dùng URL ảnh thật.
10. **Múi giờ cố định UTC+7.** `Asia/Ho_Chi_Minh` không có DST nên chuyển đổi được chính xác bằng phép trừ 7 giờ, không cần thư viện tz đầy đủ.
11. **`id` là UUID, không phải slug.** Các route admin dùng `/admin/phim/[id]/...` với `id` là UUID của Postgres. Gõ sai (ví dụ dùng slug) sẽ ra 404 chứ không phải lỗi 500 — store kiểm tra định dạng UUID trước khi gọi PostgREST (`src/lib/data/uuid.ts`).
12. **Không có biểu đồ hay lượt xem giả.** Dashboard chỉ hiển thị số liệu đếm được từ dữ liệu thật.

---

## Kiểm thử

```bash
npm run typecheck   # ✅ pass (tsc --noEmit, 0 error)
npm test            # ✅ 249 test pass (19 file)
npm run build       # ✅ pass (kèm lint + typecheck của Next)
```

| File test | Phủ |
| --- | --- |
| `tests/provider.test.ts` | Allowlist hostname chính xác, HTTPS-only, chặn `javascript:`/`data:`/`http:`, hostname giả mạo (`youtube.com.evil.test`, `notfacebook.com`, `myyoutube.com`), định dạng YouTube/Facebook, sinh embed URL, không autoplay |
| `tests/date.test.ts` | Chuyển đổi múi giờ, ranh giới ngày, tuần bắt đầu Thứ hai, cửa sổ tuần neo theo giờ Việt Nam |
| `tests/slug.test.ts` | Slugify tiếng Việt |
| `tests/demo-schedule.test.ts` | Lịch demo phủ đủ 7 ngày, phân biệt sự kiện đã qua và sắp tới |
| `tests/image-hosts.test.ts` | Allowlist host ảnh, phân loại local/remote/external, chuẩn hoá URL Dashboard Supabase → URL file công khai |
| `tests/schemas.test.ts` | Zod schema: slug, URL ảnh (kể cả link Dashboard bị từ chối có thông báo rõ), video URL, số tập |
| `tests/brand-logo.test.tsx` | Logo từ `site_settings.logo_url`, fallback về dấu 閣 khi thiếu / ảnh lỗi |
| `tests/admin-privacy.test.ts` | Trang admin không rò rỉ metadata công khai, guard session |
| `tests/cache.test.ts` | Cache TTL và `invalidatePublicCache` |
| `tests/uuid.test.ts` | Guard UUID — URL admin sai định dạng id trả 404 thay vì lỗi 500 |

### Kiểm tra giao diện và luồng tương tác (tự động, bằng Chrome headless)

Các script trong `scripts/` chạy thật trên `next dev` **và** trên `next start` (bản production build):

```bash
npm run build && npx next start -p 3222   # terminal 1
node scripts/responsive-check.mjs         # terminal 2 — kiểm tra overflow ở 375/768/1440
node scripts/interaction-check.mjs        # luồng tương tác thật trong trình duyệt
node scripts/shot.mjs                     # chụp ảnh màn hình để soi bằng mắt
```

Kết quả đã chạy thật vào lần cuối:

| Kiểm tra | Kết quả |
| --- | --- |
| `responsive-check.mjs` trên 8 route × 3 bề rộng (375 / 768 / 1440) | **0 vấn đề** — `scrollWidth === clientWidth` ở mọi trang, 0 link chết (`href="#"` hoặc rỗng) |
| `interaction-check.mjs` | **12/12 pass** — tìm kiếm sống ghi vào URL, lọc thể loại theo URL, phân trang, sắp xếp, ghi `localStorage` khi mở tập, mục "Tiếp tục xem" hiện ở trang chủ, slug sai hiện trang 404, bài viết không thực thi script |
| Kiểm tra console | Không còn lỗi CSP, không còn lỗi render |
| Ảnh poster | `next/image` trả 200, `naturalWidth > 0` (trước đây 400 vì optimizer từ chối SVG) |

### Responsive

Đã kiểm tra ở 375px / 768px / 1440px: không có horizontal overflow, không có nút chết, không có thông báo thành công giả. Trang admin dùng thanh nav cuộn ngang riêng ở mobile (có chủ đích, không làm tràn trang).

---

## Các bước cần cấu hình bên ngoài và phần chưa xác minh

### Cần cấu hình (bắt buộc để chạy production)

- [ ] Tạo project Supabase, điền `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Chạy 3 file migration (`001`, `002`, `003`) — `supabase db push`, **không** chạy seed
- [ ] Tạo user admin trong Supabase Auth + chạy `npm run db:bootstrap-admin -- <email>` để tạo dòng `role = 'admin'` trong `public.profiles`
- [ ] Nạp danh sách thể loại vào bảng `genres` (bảng rỗng thì form phim không có gì để tick)
- [ ] Đặt `Site URL` và `Redirect URLs` trong Supabase Auth
- [ ] Deploy lên Vercel + đặt `NEXT_PUBLIC_SITE_URL`
- [ ] (Tuỳ chọn) Cấu hình SMTP cho Supabase Auth nếu dùng production

### Đã xác minh trên production thật

| Hạng mục | Kết quả |
| --- | --- |
| Đăng nhập admin → vào `/admin` | ✅ Đăng nhập thành công, dashboard hiển thị số liệu từ production DB |
| Đọc production DB bằng anon key (RLS) | ✅ Chỉ trả về phim `status = 'published'` |
| Các trang public với DB rỗng | ✅ `/`, `/phim`, `/lich-chieu`, `/bai-viet` đều 200, hiện empty-state sạch, không crash |
| Các trang admin với DB rỗng | ✅ `/admin/phim`, `/admin/lich-chieu`, `/admin/bai-viet` đều 200, empty-state sạch |
| Upload ảnh lên Storage | ✅ Bucket `media` public, nút "Tải lên" trả URL `*.supabase.co` |
| Render ảnh ngang 16:9 | ✅ `next/image` trả 200, `naturalWidth > 0` |
| Quản lý tập (`/admin/phim/<uuid>/episodes`) | ✅ 1 tập đã xuất bản, nguồn Facebook hiển thị đúng |
| URL admin sai định dạng id | ✅ `/admin/phim/thien-dao-du-do/episodes` trả **404** thay vì trang lỗi 500 (guard UUID trong `src/lib/data/uuid.ts`) |
| Trang lịch chiếu / bài viết / cài đặt | ✅ 200, đọc đúng `site_settings` (logo, email liên hệ, SEO) từ production DB |
| Trang chủ với DB thật | ✅ Hero hiển thị phim nổi bật, các khối còn lại hiện empty-state sạch |

### Chưa xác minh được trong môi trường hiện tại

Các mục dưới đây **chưa được chạy thật** vì môi trường build này không có project Supabase, không có tài khoản admin và không có video thật:

| Hạng mục | Lý do | Cách xác minh khi có môi trường thật |
| --- | --- | --- |
| Phát video YouTube/Facebook thật | Không có video hợp pháp trong môi trường này | Dán URL `https://www.youtube.com/watch?v=<id công khai>` vào một tập, kiểm tra khung nhúng |
| Render thực tế của `sitemap.xml` với dữ liệu thật | `sitemap.ts` trả về mảng rỗng ở chế độ demo | Kiểm tra `/sitemap.xml` sau khi thêm phim |
| Chạy `seed.sql` trên PostgreSQL thật | Chưa có instance Postgres | `psql "$DATABASE_URL" -f supabase/seed.sql` và kiểm tra lịch có đủ 7 ngày |
| Header CSP không chặn nhầm tài nguyên của Next.js | **Đã xác minh trên bản production build** (`npx next start`) — không có lỗi CSP trong console, hydration hoạt động, ảnh và video tải được | Sau khi deploy, kiểm tra lại header `Content-Security-Policy` trên domain thật |

> Ngoài ra, hành vi thực tế của Facebook Embedded Video Player có thể thay đổi theo thời gian; luôn kiểm tra tài liệu chính thức của Meta trước khi triển khai production.

---

## Giấy phép nội dung

Chủ website chịu trách nhiệm bảo đảm mình có quyền sử dụng mọi video được nhúng. Ghiền Phim chỉ cung cấp cơ chế nhúng chính thức và không lưu trữ bất kỳ tệp video nào. Dữ liệu demo dùng phim mở của Blender Foundation (Creative Commons BY 3.0).

## Giấy phép mã nguồn

MIT.
