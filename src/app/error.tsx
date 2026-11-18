"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Only the error name/digest is logged - never any secrets or user data.
    console.error("Lỗi render trang:", error.name, error.digest ?? "");
  }, [error]);

  return (
    <div className="mx-auto flex max-w-[820px] flex-col items-center px-4 py-24 text-center">
      <AlertTriangle className="size-10 text-rouge-300" aria-hidden="true" />
      <h1 className="mt-4 font-serif text-2xl font-semibold text-parchment-100">
        Đã xảy ra lỗi
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-parchment-300/85">
        Trang này gặp sự cố khi tải dữ liệu. Bạn có thể thử lại hoặc quay về trang chủ.
      </p>
      {error.digest && <p className="mt-2 text-xs text-mist-500">Mã lỗi: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Thử lại</Button>
        <Button asChild variant="outline">
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    </div>
  );
}