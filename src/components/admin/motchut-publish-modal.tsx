"use client";

import * as React from "react";
import {
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  getMotChutConfigStatusAction,
  getMotChutMineAction,
  getMovieEpisodesForMotChutAction,
  submitToMotChutAction,
} from "@/app/admin/(panel)/phim/motchut-actions";
import {
  MOTCHUT_ALLOWED_TAGS,
  findMatchingMotChutMovie,
  isValidMotChutCode,
  isValidMotChutThumbnail,
  mapGenresToMotChutTags,
  normalizeTitleForMatch,
  type MotChutMineMovie,
  type MotChutMinePending,
  type MotChutPart,
  type MotChutTag,
} from "@/lib/motchut";
import { cn } from "@/lib/utils";

export interface MotChutPrefillData {
  title: string;
  originalTitle?: string;
  thumbnail?: string;
  description?: string;
  tags?: string[];
  completed?: boolean;
  parts?: MotChutPart[];
}

type SubmitMode = "create" | "append" | "replace";

export function MotChutPublishModal({
  open,
  onOpenChange,
  contextMode,
  movieId,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextMode: "movie" | "episode";
  movieId?: string;
  prefill: MotChutPrefillData;
}) {
  const { toast } = useToast();

  // Trạng thái cấu hình mã CTV
  const [hasEnvCode, setHasEnvCode] = React.useState<boolean | null>(null);
  const [manualCode, setManualCode] = React.useState("");

  // Dữ liệu từ Endpoint B (view=mine)
  const [loadingMine, setLoadingMine] = React.useState(false);
  const [mineError, setMineError] = React.useState<string | null>(null);
  const [contributor, setContributor] = React.useState("");
  const [mineMovies, setMineMovies] = React.useState<MotChutMineMovie[]>([]);
  const [minePending, setMinePending] = React.useState<MotChutMinePending[]>([]);
  const [autoMatchedMovie, setAutoMatchedMovie] = React.useState<MotChutMineMovie | null>(null);

  // Chế độ gửi (A: create | C: append / replace)
  const [mode, setMode] = React.useState<SubmitMode>("create");
  const [updateFor, setUpdateFor] = React.useState("");

  // Trường dữ liệu khớp theo API Một Chút
  const [title, setTitle] = React.useState("");
  const [originalTitle, setOriginalTitle] = React.useState("");
  const [thumbnail, setThumbnail] = React.useState("");
  const [thumbnailWarning, setThumbnailWarning] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<MotChutTag[]>([]);
  const [completed, setCompleted] = React.useState(false);
  const [parts, setParts] = React.useState<MotChutPart[]>([
    { name: "Mùa 1", fbUrl: "", ytUrl: "" },
  ]);

  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState<{
    id: string;
    message: string;
  } | null>(null);

  const loadMineList = React.useCallback(
    async (overrideCode?: string, initialTitle?: string, initialOriginal?: string) => {
      setLoadingMine(true);
      setMineError(null);
      const res = await getMotChutMineAction(overrideCode);
      setLoadingMine(false);

      if (!res.ok) {
        setMineError(res.error);
        return;
      }

      setContributor(res.data.contributor);
      setMineMovies(res.data.movies);
      setMinePending(res.data.pending);

      const matched = findMatchingMotChutMovie(
        res.data.movies,
        initialTitle ?? title,
        initialOriginal ?? originalTitle,
      );
      setAutoMatchedMovie(matched);

      if (matched) {
        setUpdateFor(matched.id);
        if (contextMode === "episode") {
          setMode("append");
        }
      }
    },
    [contextMode, title, originalTitle],
  );

  // Khớp sẵn dữ liệu mỗi lần mở modal
  React.useEffect(() => {
    if (!open) return;

    setSubmitError(null);
    setSubmitSuccess(null);
    setMineError(null);
    setAutoMatchedMovie(null);
    setUpdateFor("");
    setMode("create");

    const nextTitle = (prefill.title ?? "").trim().slice(0, 160);
    const nextOriginal = (prefill.originalTitle ?? "").trim().slice(0, 160);
    setTitle(nextTitle);
    setOriginalTitle(nextOriginal);
    setDescription((prefill.description ?? "").trim().slice(0, 2500));
    setSelectedTags(mapGenresToMotChutTags(prefill.tags ?? []));
    setCompleted(Boolean(prefill.completed));

    const rawThumb = (prefill.thumbnail ?? "").trim();
    if (rawThumb && isValidMotChutThumbnail(rawThumb)) {
      setThumbnail(rawThumb);
      setThumbnailWarning(null);
    } else {
      setThumbnail("");
      setThumbnailWarning(
        rawThumb
          ? "Ảnh bìa hiện tại không phải link HTTPS kết thúc bằng .jpg/.jpeg/.png/.webp nên đã để trống (Một Chút sẽ báo lỗi 400 nếu sai định dạng)."
          : null,
      );
    }

    const initialParts =
      prefill.parts && prefill.parts.length > 0
        ? prefill.parts.map((p) => ({
            name: p.name,
            fbUrl: p.fbUrl ?? "",
            ytUrl: p.ytUrl ?? "",
          }))
        : [{ name: "Mùa 1", fbUrl: "", ytUrl: "" }];
    setParts(initialParts);

    let cancelled = false;

    async function bootstrap() {
      // Nếu đang ở form Sửa phim và chưa có parts thì thử nạp từ các tập đã lưu trong DB
      if (
        contextMode === "movie" &&
        movieId &&
        (!prefill.parts || prefill.parts.length === 0)
      ) {
        const epRes = await getMovieEpisodesForMotChutAction(movieId);
        if (!cancelled && epRes.parts.length > 0) {
          setParts(epRes.parts);
        }
      }

      const status = await getMotChutConfigStatusAction();
      if (cancelled) return;
      setHasEnvCode(status.hasEnvCode);

      if (status.hasEnvCode || isValidMotChutCode(manualCode)) {
        await loadMineList(
          status.hasEnvCode ? undefined : manualCode,
          nextTitle,
          nextOriginal,
        );
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function updatePart(index: number, patch: Partial<MotChutPart>) {
    setParts((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPart() {
    if (parts.length >= 30) {
      toast("Một Chút chỉ cho phép tối đa 30 phần mỗi lần gửi.", "error");
      return;
    }
    setParts((prev) => [
      ...prev,
      { name: `Mùa ${prev.length + 1}`, fbUrl: "", ytUrl: "" },
    ]);
  }

  function removePart(index: number) {
    if (parts.length <= 1) return;
    setParts((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleTag(tag: MotChutTag) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      if (prev.length >= 8) {
        toast("Một Chút chỉ cho phép chọn tối đa 8 thể loại.", "error");
        return prev;
      }
      return [...prev, tag];
    });
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitSuccess(null);
    setSubmitting(true);

    const res = await submitToMotChutAction(
      {
        title,
        originalTitle,
        format: "Phim 3D",
        audio: "Thuyết Minh",
        thumbnail,
        description,
        tags: selectedTags,
        ...(completed ? { completed: true } : {}),
        parts,
        updateFor: mode === "create" ? "" : updateFor,
        updateMode: mode === "create" ? "append" : mode,
      },
      hasEnvCode ? undefined : manualCode,
    );

    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(res.error);
      toast(res.error, "error");
      return;
    }

    setSubmitSuccess({ id: res.data.id, message: res.data.message });
    toast("Đã gửi bài sang Một Chút thành công!", "success");

    // Làm mới danh sách pending từ view=mine
    if (hasEnvCode || isValidMotChutCode(manualCode)) {
      void loadMineList(hasEnvCode ? undefined : manualCode, title, originalTitle);
    }
  }

  const pendingMatch = React.useMemo(() => {
    const target = normalizeTitleForMatch(title);
    if (!target) return null;
    return minePending.find((p) => normalizeTitleForMatch(p.title) === target) ?? null;
  }, [minePending, title]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 font-serif text-xl text-parchment-100">
              Đăng bên Một Chút
              <Badge variant="gold" className="text-xs font-normal">
                motchutphim.com
              </Badge>
            </DialogTitle>
            {contributor && (
              <Badge variant="jade" className="text-xs">
                CTV: {contributor}
              </Badge>
            )}
          </div>
          <DialogDescription>
            Thông tin phim và link tập đã được tự động khớp theo chuẩn API Một Chút. Bài gửi sẽ
            vào hàng chờ kiểm duyệt (`pending`).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Nếu server chưa cài MOTCHUT_CTV_CODE thì cho phép nhập nhanh tại đây */}
          {hasEnvCode === false && (
            <div className="rounded-lg border border-gold-500/35 bg-gold-500/[0.06] p-3.5 space-y-2">
              <div className="flex items-start gap-2 text-xs text-parchment-200">
                <Info className="mt-0.5 size-4 shrink-0 text-gold-400" aria-hidden="true" />
                <div>
                  <p className="font-medium text-gold-300">
                    Chưa cấu hình biến môi trường <code>MOTCHUT_CTV_CODE</code>
                  </p>
                  <p className="mt-0.5 text-parchment-300/80">
                    Bạn có thể dán tạm mã CTV 32 ký tự bên dưới để dùng ngay, hoặc thêm{" "}
                    <code>MOTCHUT_CTV_CODE=...</code> vào <code>.env.local</code> để tự động xác thực.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="password"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Dán mã cộng tác viên 32 ký tự..."
                  className="flex-1 min-w-[240px] font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!isValidMotChutCode(manualCode) || loadingMine}
                  onClick={() => void loadMineList(manualCode, title, originalTitle)}
                >
                  {loadingMine ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  Kiểm tra &amp; Tải phim
                </Button>
              </div>
            </div>
          )}

          {/* Thanh chọn Endpoint / Chế độ + Đồng bộ view=mine */}
          <div className="rounded-lg border border-ink-700 bg-ink-900/50 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs uppercase tracking-wider text-parchment-300">
                Chế độ gửi API
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loadingMine || (hasEnvCode === false && !isValidMotChutCode(manualCode))}
                onClick={() =>
                  void loadMineList(hasEnvCode ? undefined : manualCode, title, originalTitle)
                }
                className="h-7 px-2 text-xs"
              >
                {loadingMine ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Đồng bộ danh sách (`view=mine`)
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setMode("create")}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-xs transition-colors",
                  mode === "create"
                    ? "border-gold-400 bg-gold-500/15 text-gold-200"
                    : "border-ink-700 bg-ink-950/50 text-parchment-300/80 hover:border-ink-600",
                )}
              >
                <div className="font-semibold">1. Đăng phim mới</div>
                <div className="mt-0.5 text-xs opacity-80">Endpoint A (`view=submit`)</div>
              </button>

              <button
                type="button"
                onClick={() => setMode("append")}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-xs transition-colors",
                  mode === "append"
                    ? "border-gold-400 bg-gold-500/15 text-gold-200"
                    : "border-ink-700 bg-ink-950/50 text-parchment-300/80 hover:border-ink-600",
                )}
              >
                <div className="font-semibold">2. Nối thêm mùa / tập</div>
                <div className="mt-0.5 text-xs opacity-80">Endpoint C (`append`)</div>
              </button>

              <button
                type="button"
                onClick={() => setMode("replace")}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-xs transition-colors",
                  mode === "replace"
                    ? "border-gold-400 bg-gold-500/15 text-gold-200"
                    : "border-ink-700 bg-ink-950/50 text-parchment-300/80 hover:border-ink-600",
                )}
              >
                <div className="font-semibold">3. Sửa phim đã duyệt</div>
                <div className="mt-0.5 text-xs opacity-80">Endpoint C (`replace`)</div>
              </button>
            </div>

            {autoMatchedMovie && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-jade-500/35 bg-jade-500/10 px-3 py-2 text-xs text-jade-200">
                <span>
                  Đã tự động khớp phim trên Một Chút:{" "}
                  <strong>{autoMatchedMovie.title}</strong> ({autoMatchedMovie.parts.length} phần)
                </span>
                {mode === "create" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setUpdateFor(autoMatchedMovie.id);
                      setMode(contextMode === "episode" ? "append" : "replace");
                    }}
                  >
                    Chuyển sang cập nhật phim này
                  </Button>
                )}
              </div>
            )}

            {pendingMatch && (
              <p className="rounded border border-gold-500/35 bg-gold-500/10 px-3 py-2 text-xs text-gold-200">
                Lưu ý: Bộ phim <strong>{pendingMatch.title}</strong> hiện đã có 1 yêu cầu đang chờ
                admin Một Chút duyệt (`{pendingMatch.id}`).
              </p>
            )}

            {mineError && (
              <p className="text-xs text-rouge-300">{mineError}</p>
            )}

            {(mode === "append" || mode === "replace") && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="motchut-update-for">
                  Phim đã duyệt trên Một Chút (`updateFor`)
                </Label>
                {mineMovies.length > 0 ? (
                  <Select value={updateFor} onValueChange={setUpdateFor}>
                    <SelectTrigger id="motchut-update-for">
                      <SelectValue placeholder="Chọn phim đã duyệt từ danh sách..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mineMovies.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.title} ({m.parts.length} phần) — {m.id.slice(0, 18)}…
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="motchut-update-for"
                    value={updateFor}
                    onChange={(e) => setUpdateFor(e.target.value)}
                    placeholder="contrib-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="font-mono text-xs"
                  />
                )}
              </div>
            )}
          </div>

          {/* Thông tin phim (ẩn bớt khi chỉ dùng chế độ append) */}
          {mode !== "append" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="motchut-title">Tên phim tiếng Việt *</Label>
                <Input
                  id="motchut-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={160}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="motchut-original-title">Tên gốc tiếng Trung</Label>
                <Input
                  id="motchut-original-title"
                  value={originalTitle}
                  onChange={(e) => setOriginalTitle(e.target.value)}
                  maxLength={160}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="motchut-thumbnail">
                  Ảnh bìa 16:9 (`thumbnail` — HTTPS .jpg/.png/.webp)
                </Label>
                <Input
                  id="motchut-thumbnail"
                  value={thumbnail}
                  onChange={(e) => {
                    setThumbnail(e.target.value);
                    setThumbnailWarning(null);
                  }}
                  placeholder="https://domain.com/poster-16x9.webp"
                />
                {thumbnailWarning && (
                  <p className="text-xs text-gold-300/90">{thumbnailWarning}</p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>
                  Thể loại Một Chút (`tags` — đã tự khớp từ thể loại Ghiền Phim, tối đa 8)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {MOTCHUT_ALLOWED_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          active
                            ? "border-gold-400 bg-gold-500/20 text-gold-200"
                            : "border-ink-700 bg-ink-950/60 text-parchment-300/80 hover:border-ink-500 hover:text-parchment-100",
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="motchut-desc">Mô tả (`description` — tối đa 2.500 ký tự)</Label>
                <textarea
                  id="motchut-desc"
                  rows={3}
                  maxLength={2500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-ink-700 bg-ink-950/70 px-3 py-2 text-sm text-parchment-100 placeholder:text-mist-500 focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch
                  id="motchut-completed"
                  checked={completed}
                  onCheckedChange={setCompleted}
                />
                <Label htmlFor="motchut-completed" className="cursor-pointer">
                  Đã hoàn thành / Trọn bộ (`completed: {String(completed)}`)
                </Label>
              </div>
            </div>
          )}

          {/* Danh sách Phần / Mùa (parts) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-parchment-100">
                Danh sách phần / tập đẩy lên ({parts.length}/30)
              </Label>
              <Button type="button" variant="secondary" size="sm" onClick={addPart}>
                <Plus className="size-3.5" />
                Thêm phần
              </Button>
            </div>

            <div className="space-y-2.5">
              {parts.map((part, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-ink-700 bg-ink-900/40 p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gold-300">Phần #{index + 1}</span>
                    {parts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removePart(index)}
                        title="Xoá phần này"
                      >
                        <Trash2 className="size-3.5 text-rouge-400" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label htmlFor={`mc-part-name-${index}`} className="text-xs">
                        Tên phần (`name`) *
                      </Label>
                      <Input
                        id={`mc-part-name-${index}`}
                        value={part.name}
                        onChange={(e) => updatePart(index, { name: e.target.value })}
                        placeholder="Mùa 1"
                        maxLength={80}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`mc-part-fb-${index}`} className="text-xs">
                        Facebook URL (`fbUrl`)
                      </Label>
                      <Input
                        id={`mc-part-fb-${index}`}
                        value={part.fbUrl ?? ""}
                        onChange={(e) => updatePart(index, { fbUrl: e.target.value })}
                        placeholder="https://www.facebook.com/reel/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`mc-part-yt-${index}`} className="text-xs">
                        YouTube URL (`ytUrl`)
                      </Label>
                      <Input
                        id={`mc-part-yt-${index}`}
                        value={part.ytUrl ?? ""}
                        onChange={(e) => updatePart(index, { ytUrl: e.target.value })}
                        placeholder="https://youtu.be/..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {submitError && (
            <div
              role="alert"
              className="rounded-md border border-rouge-500/50 bg-rouge-500/10 px-4 py-3 text-sm text-rouge-300"
            >
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="rounded-md border border-jade-500/50 bg-jade-500/10 px-4 py-3 text-sm text-jade-200 space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4 text-jade-300" />
                {submitSuccess.message}
              </div>
              {submitSuccess.id && (
                <p className="text-xs opacity-85 font-mono">ID: {submitSuccess.id}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 pt-4">
            <a
              href="https://motchutphim.com/contribute"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-parchment-300/75 hover:text-gold-300"
            >
              Mở trang CTV Một Chút
              <ExternalLink className="size-3" />
            </a>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className="bg-gold-500 text-ink-950 hover:bg-gold-400"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {mode === "create"
                  ? "Gửi phim mới sang Một Chút"
                  : mode === "append"
                    ? "Nối thêm phần sang Một Chút"
                    : "Cập nhật phim sang Một Chút"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
