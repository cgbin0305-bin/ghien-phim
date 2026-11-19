"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, QrCode, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/admin/submit-button";
import { LogoPreview } from "@/components/admin/logo-preview";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { DonateModal } from "@/components/player/donate-modal";
import {
  COMMON_VIETQR_BANKS,
  DONATE_CONFIG,
  buildVietQrImageUrl,
  normalizeDonateConfig,
} from "@/config/donateConfig";
import { useToast } from "@/components/ui/toast";
import { updateSettingsAction } from "@/app/admin/(panel)/cai-dat/actions";
import type { MovieWithStats, SiteSettings } from "@/lib/types";

const formSchema = z.object({
  siteName: z.string().trim().min(1, "Tên website không được để trống."),
  siteDescription: z.string().trim(),
  logoUrl: z.string().trim(),
  contactEmail: z.string().trim(),
  contactNote: z.string().trim(),
  seoTitle: z.string().trim(),
  seoDescription: z.string().trim(),
  ogImageUrl: z.string().trim(),
  featuredMovieId: z.string().trim(),
  donateButtonText: z.string().trim(),
  donateTitle: z.string().trim(),
  donateMessage: z.string().trim(),
  donateBankName: z.string().trim(),
  donateAccountNumber: z.string().trim(),
  donateAccountHolder: z.string().trim(),
  donateTransferContent: z.string().trim(),
  donateQrImageUrl: z.string().trim(),
});

type SettingsFormValues = z.infer<typeof formSchema>;

export function SettingsForm({
  settings,
  movies,
}: {
  settings: SiteSettings;
  movies: MovieWithStats[];
}) {
  const { toast } = useToast();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = React.useState<string | null>(null);
  const [featuredMovieId, setFeaturedMovieId] = React.useState(settings.featuredMovieId ?? "");
  const [previewDonateOpen, setPreviewDonateOpen] = React.useState(false);

  const initialDonate = React.useMemo(
    () => normalizeDonateConfig(settings.donateConfig ?? DONATE_CONFIG),
    [settings.donateConfig],
  );

  // Đoán mã ngân hàng VietQR từ tên ngân hàng hiện tại
  const [selectedBankCode, setSelectedBankCode] = React.useState<string>(() => {
    const matched = COMMON_VIETQR_BANKS.find(
      (b) =>
        b.name.toLowerCase() === initialDonate.bankName.toLowerCase() ||
        b.code.toLowerCase() === initialDonate.bankName.toLowerCase(),
    );
    return matched?.code ?? "MB";
  });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription ?? "",
      logoUrl: settings.logoUrl ?? "",
      contactEmail: settings.contactEmail ?? "",
      contactNote: settings.contactNote ?? "",
      seoTitle: settings.seoTitle ?? "",
      seoDescription: settings.seoDescription ?? "",
      ogImageUrl: settings.ogImageUrl ?? "",
      featuredMovieId: settings.featuredMovieId ?? "",
      donateButtonText: initialDonate.buttonText,
      donateTitle: initialDonate.title,
      donateMessage: initialDonate.message,
      donateBankName: initialDonate.bankName,
      donateAccountNumber: initialDonate.accountNumber,
      donateAccountHolder: initialDonate.accountHolder,
      donateTransferContent: initialDonate.transferContent,
      donateQrImageUrl: initialDonate.qrImageUrl,
    },
  });

  const liveDonateConfig = normalizeDonateConfig({
    buttonText: watch("donateButtonText"),
    title: watch("donateTitle"),
    message: watch("donateMessage"),
    bankName: watch("donateBankName"),
    accountNumber: watch("donateAccountNumber"),
    accountHolder: watch("donateAccountHolder"),
    transferContent: watch("donateTransferContent"),
    qrImageUrl: watch("donateQrImageUrl"),
  });

  const handleGenerateVietQr = () => {
    const accountNumber = (watch("donateAccountNumber") ?? "").trim();
    if (!accountNumber) {
      toast("Vui lòng nhập Số tài khoản trước khi tạo mã VietQR.", "error");
      return;
    }
    const url = buildVietQrImageUrl({
      bankCode: selectedBankCode,
      accountNumber,
      accountHolder: watch("donateAccountHolder"),
      transferContent: watch("donateTransferContent"),
    });
    setValue("donateQrImageUrl", url, { shouldDirty: true, shouldValidate: true });
    toast("Đã tạo link mã QR VietQR tự động theo thông tin tài khoản!", "success");
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setServerSuccess(null);

    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.set(key, value ?? "");
    }
    formData.set(
      "featuredMovieId",
      featuredMovieId === "__none__" ? "" : featuredMovieId,
    );

    const result = await updateSettingsAction({}, formData);
    if (result?.error) {
      setServerError(result.error);
      toast(result.error, "error");
      if (result.fieldErrors) {
        for (const [name, message] of Object.entries(result.fieldErrors)) {
          setError(name as never, { type: "server", message });
        }
      }
    }
    if (result?.success) {
      setServerSuccess(result.success);
      toast(result.success, "success");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {serverError && (
        <p
          role="alert"
          className="rounded-md border border-rouge-500/40 bg-rouge-500/10 px-4 py-3 text-sm text-rouge-300"
        >
          {serverError}
        </p>
      )}
      {serverSuccess && (
        <p
          role="status"
          className="rounded-md border border-jade-500/40 bg-jade-500/10 px-4 py-3 text-sm text-jade-100"
        >
          {serverSuccess}
        </p>
      )}

      {/* Khu vực cấu hình Donate / Chuyển khoản Thưởng Linh Thạch */}
      <section className="panel oriental-frame space-y-5 border-gold-500/40 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-700/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-gold-300" aria-hidden="true" />
              <h2 className="font-serif text-lg font-semibold text-gold-200">
                Thông tin Chuyển khoản / Ủng Hộ (Thưởng Linh Thạch)
              </h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-parchment-300/85">
              Cấu hình nút &ldquo;Thưởng Linh Thạch&rdquo; và Popup mã QR chuyển khoản hiển thị bên dưới khung trình phát video.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewDonateOpen(true)}
          >
            <Eye className="size-3.5" aria-hidden="true" />
            Xem thử Popup Donate
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="donateButtonText">Tên nút bấm hiển thị</Label>
            <Input
              id="donateButtonText"
              placeholder="Thưởng Linh Thạch"
              {...register("donateButtonText")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="donateTitle">Tiêu đề Popup</Label>
            <Input
              id="donateTitle"
              placeholder="Cảm Tạ Đạo Hữu Đã Ủng Hộ"
              {...register("donateTitle")}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="donateMessage">Lời nhắn cảm ơn</Label>
            <textarea
              id="donateMessage"
              rows={2}
              placeholder="Mỗi viên Linh Thạch của đạo hữu là nguồn linh khí quý giá..."
              className="w-full rounded-md border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-parchment-100 focus-visible:border-gold-500/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
              {...register("donateMessage")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vietQrBankSelect">Chọn nhanh ngân hàng (VietQR)</Label>
            <Select
              value={selectedBankCode}
              onValueChange={(code) => {
                setSelectedBankCode(code);
                const found = COMMON_VIETQR_BANKS.find((b) => b.code === code);
                if (found) {
                  setValue("donateBankName", found.name, { shouldDirty: true });
                }
              }}
            >
              <SelectTrigger id="vietQrBankSelect">
                <SelectValue placeholder="Chọn ngân hàng" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_VIETQR_BANKS.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name} ({bank.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="donateBankName">Tên ngân hàng hiển thị</Label>
            <Input
              id="donateBankName"
              placeholder="VD: MB Bank, Vietcombank..."
              {...register("donateBankName")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="donateAccountNumber">Số tài khoản</Label>
            <Input
              id="donateAccountNumber"
              placeholder="0123456789"
              {...register("donateAccountNumber")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="donateAccountHolder">Tên chủ tài khoản (in hoa không dấu)</Label>
            <Input
              id="donateAccountHolder"
              placeholder="NGUYEN VAN A"
              {...register("donateAccountHolder")}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="donateTransferContent">Nội dung chuyển khoản gợi ý</Label>
            <Input
              id="donateTransferContent"
              placeholder="UNG HO GHIEN PHIM"
              {...register("donateTransferContent")}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="donateQrImageUrl">URL ảnh mã QR (VietQR hoặc ảnh tải lên)</Label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGenerateVietQr}
              >
                <QrCode className="size-3.5 text-gold-300" aria-hidden="true" />
                Tạo mã VietQR tự động từ STK trên
              </Button>
            </div>
            <Input
              id="donateQrImageUrl"
              placeholder="https://img.vietqr.io/image/MB-0123456789-compact2.png?..."
              {...register("donateQrImageUrl")}
            />

            <ImageUploadField
              id="donateQrUpload"
              label="Hoặc tải ảnh mã QR từ máy tính lên"
              hint="Bạn có thể tải trực tiếp ảnh QR ngân hàng/ví điện tử từ máy tính lên Supabase Storage."
              value={watch("donateQrImageUrl") ?? ""}
              onUploaded={(url) =>
                setValue("donateQrImageUrl", url, { shouldDirty: true })
              }
              aspect="square"
              showInput={false}
              className="mt-2"
            />
          </div>
        </div>

        <DonateModal
          open={previewDonateOpen}
          onClose={() => setPreviewDonateOpen(false)}
          config={liveDonateConfig}
        />
      </section>

      <section className="panel space-y-4 p-5 sm:p-6">
        <h2 className="font-serif text-base font-semibold text-parchment-100">Thông tin website</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="siteName">Tên website</Label>
            <Input id="siteName" {...register("siteName")} />
            {errors.siteName && <p className="text-xs text-rouge-300">{errors.siteName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="logoUrl">URL logo</Label>
            <Input id="logoUrl" placeholder="https://…" {...register("logoUrl")} />
            {errors.logoUrl && <p className="text-xs text-rouge-300">{errors.logoUrl.message}</p>}
            <LogoPreview url={watch("logoUrl") ?? ""} />
            <ImageUploadField
              id="logoUpload"
              label="Hoặc tải logo lên"
              hint="Tải ảnh lên Supabase Storage và tự điền URL — không phải copy link từ trang quản trị Supabase."
              value={watch("logoUrl") ?? ""}
              onUploaded={(url) => setValue("logoUrl", url, { shouldDirty: true })}
              aspect="square"
              showInput={false}
              className="mt-2"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="siteDescription">Mô tả website</Label>
            <textarea
              id="siteDescription"
              rows={2}
              className="w-full rounded-md border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-parchment-100 focus-visible:border-gold-500/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
              {...register("siteDescription")}
            />
            {errors.siteDescription && (
              <p className="text-xs text-rouge-300">{errors.siteDescription.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel space-y-4 p-5 sm:p-6">
        <h2 className="font-serif text-base font-semibold text-parchment-100">Liên hệ</h2>
        <p className="text-xs leading-relaxed text-parchment-300/80">
          Để trống nếu chưa muốn hiển thị. Footer sẽ bỏ qua các trường không có giá trị.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Email liên hệ</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="lienhe@example.com"
              {...register("contactEmail")}
            />
            {errors.contactEmail && (
              <p className="text-xs text-rouge-300">{errors.contactEmail.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactNote">Ghi chú liên hệ</Label>
            <Input id="contactNote" {...register("contactNote")} />
            {errors.contactNote && (
              <p className="text-xs text-rouge-300">{errors.contactNote.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel space-y-4 p-5 sm:p-6">
        <h2 className="font-serif text-base font-semibold text-parchment-100">SEO</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="seoTitle">Tiêu đề SEO mặc định</Label>
            <Input id="seoTitle" {...register("seoTitle")} />
            {errors.seoTitle && <p className="text-xs text-rouge-300">{errors.seoTitle.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ogImageUrl">Ảnh Open Graph</Label>
            <Input id="ogImageUrl" placeholder="https://…" {...register("ogImageUrl")} />
            {errors.ogImageUrl && (
              <p className="text-xs text-rouge-300">{errors.ogImageUrl.message}</p>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="seoDescription">Mô tả SEO mặc định</Label>
            <textarea
              id="seoDescription"
              rows={2}
              className="w-full rounded-md border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-parchment-100 focus-visible:border-gold-500/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50"
              {...register("seoDescription")}
            />
            {errors.seoDescription && (
              <p className="text-xs text-rouge-300">{errors.seoDescription.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel space-y-4 p-5 sm:p-6">
        <h2 className="font-serif text-base font-semibold text-parchment-100">Phim nổi bật</h2>
        <div className="space-y-1.5">
          <Label htmlFor="featuredMovieId">Phim hiển thị ở hero trang chủ</Label>
          <Select value={featuredMovieId} onValueChange={setFeaturedMovieId}>
            <SelectTrigger id="featuredMovieId">
              <SelectValue placeholder="Chưa chọn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Chưa chọn</SelectItem>
              {movies.map((movie) => (
                <SelectItem key={movie.id} value={movie.id}>
                  {movie.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="featuredMovieId" value={featuredMovieId} />
          <p className="text-xs text-parchment-300/75">
            Nếu chưa chọn, trang chủ sẽ dùng phim có cờ “nổi bật” trong danh sách phim.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-700 pt-6">
        <SubmitButton pending={isSubmitting}>Lưu cài đặt</SubmitButton>
        <p className="text-xs text-parchment-300/75">
          Biến môi trường và secret không thể chỉnh sửa từ giao diện này.
        </p>
      </div>
    </form>
  );
}
