/**
 * Bootstrap tài khoản quản trị.
 *
 * Vì sao cần script này:
 *
 *   Bảng `public.profiles` quyết định ai được vào khu vực /admin. Bảng này
 *   KHÔNG có trigger tự sinh profile khi đăng ký — chính migration 002 ghi rõ:
 *   "No INSERT policy for regular users: a new admin profile must be created
 *   by the bootstrap script using the service role key."
 *
 *   Nói cách khác: nếu bạn tạo user trong Supabase Dashboard (Auth → Users)
 *   rồi vào /admin, bạn sẽ bị đá về /admin/login với thông báo "Tài khoản này
 *   không có quyền quản trị" — dù mật khẩu đúng. Script này tạo nốt mảnh ghép
 *   còn thiếu: dòng `profiles` với `role = 'admin'`.
 *
 * Dùng:
 *   node scripts/bootstrap-admin.mjs <email> [--password <mat-khau>]
 *
 * Yêu cầu biến môi trường (đọc từ `.env.local` nếu có):
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY
 *
 * Không có `--password` -> tạo user mới với mật khẩu ngẫu nhiên và in ra.
 * Có `--password` -> nếu user đã tồn tại thì đổi mật khẩu cho khớp.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/** Đọc `.env.local` (hoặc `.env`) và nạp vào `process.env` nếu chưa có. */
function loadEnvFile() {
  for (const name of [".env.local", ".env"]) {
    const path = resolve(ROOT, name);
    if (!existsSync(path)) continue;
    for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      // Bỏ dấu nháy bao ngoài nếu có.
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && !process.env[key]) process.env[key] = value;
    }
  }
}

loadEnvFile();

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";

if (!url || !serviceKey) {
  console.error(
    "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Hãy kiểm tra file .env.local ở thư mục gốc project.",
  );
  process.exit(1);
}

/** Sinh mật khẩu ngẫu nhiên đủ mạnh khi người dùng không truyền `--password`. */
function randomPassword() {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = lower + upper + digits + symbols;
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => all[b % all.length]);
  // Bắt buộc có đủ ký tự hoa, số và ký hiệu.
  chars[0] = upper[bytes[0] % upper.length];
  chars[1] = digits[bytes[1] % digits.length];
  chars[2] = symbols[bytes[2] % symbols.length];
  return chars.join("");
}

function parseArgs(argv) {
  const email = argv.find((a) => !a.startsWith("--"));
  let password;
  const pwIndex = argv.indexOf("--password");
  if (pwIndex !== -1) password = argv[pwIndex + 1];
  return { email, password };
}

const { email, password } = parseArgs(process.argv.slice(2));

if (!email) {
  console.error("Cách dùng: node scripts/bootstrap-admin.mjs <email> [--password <mat-khau>]");
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

const authBase = `${url.replace(/\/+$/, "")}/auth/v1/admin`;
const restBase = `${url.replace(/\/+$/, "")}/rest/v1`;

// ---------------------------------------------------------------------------
// 1. Tìm hoặc tạo user trong Supabase Auth.
// ---------------------------------------------------------------------------
let userId;
let generatedPassword;

const usersRes = await fetch(`${authBase}/users?page=1&per_page=1000`, { headers });
if (!usersRes.ok) {
  console.error(`Không đọc được danh sách user: ${usersRes.status} ${await usersRes.text()}`);
  process.exit(1);
}
const usersBody = await usersRes.json();
const existing = (usersBody.users ?? []).find(
  (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
);

if (existing) {
  userId = existing.id;
  console.log(`Đã tồn tại user ${email} (${userId}).`);

  if (password) {
    const patch = await fetch(`${authBase}/users/${userId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ password }),
    });
    if (!patch.ok) {
      console.error(`Không đổi được mật khẩu: ${patch.status} ${await patch.text()}`);
      process.exit(1);
    }
    console.log("Đã cập nhật mật khẩu.");
  }
} else {
  generatedPassword = password ?? randomPassword();
  const create = await fetch(authBase, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { email_verified: true },
    }),
  });
  if (!create.ok) {
    console.error(`Không tạo được user: ${create.status} ${await create.text()}`);
    process.exit(1);
  }
  const created = await create.json();
  userId = created.id;
  console.log(`Đã tạo user ${email} (${userId}).`);
}

// ---------------------------------------------------------------------------
// 2. Tạo/cập nhật dòng `profiles` với role = 'admin'.
//
// Dùng service role nên bỏ qua RLS. `upsert` cần `Prefer: resolution=merge-duplicates`
// để không đụng với dòng đã tồn tại.
// ---------------------------------------------------------------------------
const profileRes = await fetch(`${restBase}/profiles?on_conflict=id`, {
  method: "POST",
  headers: {
    ...headers,
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify({
    id: userId,
    email,
    display_name: existing?.user_metadata?.full_name ?? null,
    role: "admin",
  }),
});

if (!profileRes.ok) {
  console.error(`Không ghi được profiles: ${profileRes.status} ${await profileRes.text()}`);
  process.exit(1);
}

console.log(`Đã đặt role = 'admin' cho profile ${userId}.`);
console.log("");
console.log("Đăng nhập tại /admin/login bằng:");
console.log(`  Email:      ${email}`);
if (generatedPassword) {
  console.log(`  Mật khẩu:   ${generatedPassword}`);
  console.log("  (lưu lại mật khẩu này, nó không hiện lại lần nữa)");
} else {
  console.log("  Mật khẩu:   (giữ nguyên mật khẩu hiện tại)");
}
