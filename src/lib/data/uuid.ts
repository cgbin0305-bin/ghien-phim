/**
 * Kiểm tra UUID.
 *
 * Cột `id` trong Postgres là kiểu `uuid`. Khi người dùng gõ sai URL — ví dụ
 * dùng slug (`thien-dao-du-do`) thay vì id trong các route admin
 * `/admin/phim/[id]/...` — PostgREST trả về lỗi `invalid input syntax for
 * type uuid`. Store sẽ `throw` và trang rơi vào error boundary 500.
 *
 * Guard ở tầng store giúp route gọi `notFound()` một cách gọn gàng: người
 * dùng thấy "không tìm thấy" thay vì "Đã xảy ra lỗi".
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Trả về `true` nếu chuỗi là UUID hợp lệ (không phân biệt hoa/thường). */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
