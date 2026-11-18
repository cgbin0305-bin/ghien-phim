import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[820px] flex-col items-center px-4 py-24 text-center sm:py-32">
      <p className="font-serif text-6xl font-semibold text-gold-300/60">404</p>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-parchment-100 sm:text-3xl">
        Không tìm thấy trang
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-parchment-300/85">
        Trang bạn tìm không tồn tại, đã bị gỡ bỏ, hoặc nội dung chưa được xuất bản.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Về trang chủ</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/phim">Danh sách phim</Link>
        </Button>
      </div>
    </div>
  );
}