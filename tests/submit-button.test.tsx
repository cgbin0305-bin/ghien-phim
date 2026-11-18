// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SubmitButton } from "@/components/admin/submit-button";

/**
 * Chốt lại lỗi "nút kẹt Đang lưu…" do `zodResolver` không tương thích Zod v4.
 *
 * `@hookform/resolvers@3.x` khai báo peer `zod: ^3.23.8`. Khi dùng với Zod v4,
 * `ZodError` không còn có mảng `.errors` (chỉ có `.issues`), nên resolver throw
 * lỗi ra ngoài thay vì trả về `{ errors }`. React Hook Form không bắt được
 * lỗi này nên `handleSubmit` dừng giữa chừng — Server Action không bao giờ
 * chạy và nút submit kẹt vĩnh viễn ở trạng thái "Đang lưu…".
 *
 * Bộ test dưới đây bảo đảm:
 *  1. Resolver trả về lỗi dạng object (không throw) khi dữ liệu sai.
 *  2. Nút submit không bị kẹt khi validation client thất bại.
 *  3. Nút submit trở lại trạng thái bình thường khi action chạy xong.
 */

const schema = z.object({
  title: z.string().trim().min(1, "Tên phim không được để trống."),
  slug: z
    .string()
    .trim()
    .min(1, "Slug không được để trống.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug không hợp lệ."),
});

type Values = z.infer<typeof schema>;

describe("zodResolver với Zod v4", () => {
  it("trả về { errors } thay vì throw khi dữ liệu không hợp lệ", async () => {
    const resolver = zodResolver(schema);
    const result = await resolver(
      { title: "", slug: "Không Hợp Lệ" },
      {},
      {
        criteriaMode: "all",
        shouldUseNativeValidation: false,
        fields: {},
      },
    );

    const errors = result.errors as Record<string, { message?: string }>;
    expect(errors).toBeDefined();
    expect(errors.title).toBeDefined();
    expect(errors.slug).toBeDefined();
    expect(result.values).toEqual({});
  });

  it("trả về giá trị đã chuẩn hoá khi dữ liệu hợp lệ", async () => {
    const resolver = zodResolver(schema);
    const result = await resolver(
      { title: "  Vấn Kiếm Lâm Ngô  ", slug: "van-kiem-lam-ngo" },
      {},
      {
        criteriaMode: "all",
        shouldUseNativeValidation: false,
        fields: {},
      },
    );

    expect(result.errors).toEqual({});
    expect((result.values as { title: string }).title).toBe("Vấn Kiếm Lâm Ngô");
  });
});

/**
 * Form mô phỏng đúng cấu trúc của `MovieForm`: dùng `handleSubmit`, gọi một
 * "server action" giả và truyền `formState.isSubmitting` cho `SubmitButton`.
 */
function TestForm({ action }: { action: (values: Values) => Promise<{ error?: string }> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", slug: "" },
  });

  return (
    <form onSubmit={handleSubmit(action)}>
      <label htmlFor="title">Tên phim</label>
      <input id="title" {...register("title")} />
      {errors.title && <p role="alert">{errors.title.message}</p>}

      <label htmlFor="slug">Slug</label>
      <input id="slug" {...register("slug")} />
      {errors.slug && <p role="alert">{errors.slug.message}</p>}

      <SubmitButton pending={isSubmitting}>Tạo phim</SubmitButton>
    </form>
  );
}

describe("SubmitButton với React Hook Form", () => {
  it("không kẹt ở 'Đang lưu…' khi validation client thất bại", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({}));

    render(<TestForm action={action} />);

    await user.click(screen.getByRole("button", { name: "Tạo phim" }));

    // Lỗi validation được hiển thị…
    await waitFor(() => {
      expect(screen.getByText("Tên phim không được để trống.")).toBeInTheDocument();
    });

    // …và nút KHÔNG bị kẹt, server action không được gọi.
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Tạo phim" })).toBeEnabled();
  });

  it("gọi action và trở lại trạng thái bình thường khi dữ liệu hợp lệ", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ error: "Slug đã tồn tại." }));

    render(<TestForm action={action} />);

    await user.type(screen.getByLabelText("Tên phim"), "Vấn Kiếm Lâm Ngô");
    await user.type(screen.getByLabelText("Slug"), "van-kiem-lam-ngo");
    await user.click(screen.getByRole("button", { name: "Tạo phim" }));

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });

    // Nút phải trở lại trạng thái bình thường sau khi action kết thúc.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Tạo phim" })).toBeEnabled();
    });
  });
});
