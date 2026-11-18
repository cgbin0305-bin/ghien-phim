// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LogoPreview } from "@/components/admin/logo-preview";

/**
 * Chốt lại lỗi "đã thêm URL logo rồi mà chưa thấy hiện logo".
 *
 * Có hai nguyên nhân độc lập:
 *  1. `settings.logoUrl` được đọc và lưu nhưng **không chỗ nào render nó** —
 *     header và footer đều hardcode dấu ấn "閣".
 *  2. URL trỏ tới file không tồn tại trong Supabase Storage (sai tên file) nên
 *     ảnh không tải được.
 *
 * Bộ test dưới đây bảo đảm logo thật sự được render khi có URL, lùi về dấu
 * ấn mặc định khi URL hỏng, và trang Cài đặt cảnh báo sớm về URL sai.
 */

describe("BrandLogo", () => {
  it("render ảnh logo khi có URL", () => {
    render(
      <BrandLogo
        logoUrl="https://example.com/storage/v1/object/public/media/logo.png"
        siteName="Ghiền Phim"
      />,
    );

    const img = screen.getByRole("img", { name: "Logo Ghiền Phim" });
    expect(img).toHaveAttribute(
      "src",
      "https://example.com/storage/v1/object/public/media/logo.png",
    );
  });

  it("lùi về dấu ấn mặc định khi không có URL", () => {
    const { container } = render(<BrandLogo logoUrl={null} siteName="Ghiền Phim" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.textContent).toContain("閣");
  });

  it("lùi về dấu ấn mặc định khi ảnh không tải được (URL sai)", async () => {
    const { container } = render(
      <BrandLogo logoUrl="https://example.com/not-found.png" siteName="Ghiền Phim" />,
    );

    const img = screen.getByRole("img", { name: "Logo Ghiền Phim" });
    // Mô phỏng trình duyệt báo ảnh lỗi (404, sai tên file, domain bị chặn).
    img.dispatchEvent(new Event("error"));

    await waitFor(() => {
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
    expect(container.textContent).toContain("閣");
  });
});

describe("LogoPreview", () => {
  it("hiện ảnh xem trước khi URL hợp lệ", () => {
    render(<LogoPreview url="https://example.com/logo.png" />);

    const img = screen.getByRole("img", { name: "Xem trước logo" });
    expect(img).toHaveAttribute("src", "https://example.com/logo.png");
  });

  it("cảnh báo khi URL không tải được", async () => {
    render(<LogoPreview url="https://example.com/broken.png" />);

    const img = screen.getByRole("img", { name: "Xem trước logo" });
    img.dispatchEvent(new Event("error"));

    await waitFor(() => {
      expect(screen.getByText(/Không tải được ảnh/)).toBeInTheDocument();
    });
  });

  it("nhắc người dùng khi chưa nhập URL", () => {
    render(<LogoPreview url="   " />);

    expect(screen.getByText(/Chưa có URL logo/)).toBeInTheDocument();
  });

  it("không render ảnh khi URL rỗng", () => {
    render(<LogoPreview url="" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
