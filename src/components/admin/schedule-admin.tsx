"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarPlus, Copy, Trash2 } from "lucide-react";
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
import { SubmitButton } from "@/components/admin/submit-button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  createScheduleBatchAction,
  createScheduleEventAction,
  deleteScheduleEventAction,
  duplicateScheduleWeekAction,
  updateScheduleEventAction,
} from "@/app/admin/(panel)/lich-chieu/actions";
import type { Episode, MovieWithStats, ScheduleEvent } from "@/lib/types";

const STATUS_LABELS: Record<ScheduleEvent["status"], string> = {
  scheduled: "Dự kiến",
  aired: "Đã lên sóng",
  postponed: "Hoãn",
};

const WEEKDAYS = [
  { key: "mon", label: "T2" },
  { key: "tue", label: "T3" },
  { key: "wed", label: "T4" },
  { key: "thu", label: "T5" },
  { key: "fri", label: "T6" },
  { key: "sat", label: "T7" },
  { key: "sun", label: "CN" },
];

const eventSchema = z.object({
  movieId: z.string().min(1, "Vui lòng chọn phim."),
  episodeId: z.string(),
  episodeNumber: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Giờ không hợp lệ."),
  status: z.enum(["scheduled", "aired", "postponed"]),
  note: z.string().trim(),
});

type EventFormValues = z.infer<typeof eventSchema>;

export function ScheduleAdmin({
  movies,
  episodesByMovie,
  events,
  todayKey,
  currentWeekStart,
}: {
  movies: MovieWithStats[];
  episodesByMovie: Record<string, Episode[]>;
  events: ScheduleEvent[];
  todayKey: string;
  currentWeekStart: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<ScheduleEvent | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<ScheduleEvent | null>(null);
  const [mode, setMode] = React.useState<"single" | "batch">("single");
  const [selectedDays, setSelectedDays] = React.useState<string[]>(["mon", "wed", "fri"]);

  const [duplicateSource, setDuplicateSource] = React.useState(currentWeekStart);
  const [duplicateTarget, setDuplicateTarget] = React.useState("");
  const [duplicateConfirm, setDuplicateConfirm] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      movieId: movies[0]?.id ?? "",
      episodeId: "",
      episodeNumber: "",
      date: todayKey,
      time: "20:00",
      status: "scheduled",
      note: "",
    },
  });

  const selectedMovieId = watch("movieId");
  const movieEpisodes = React.useMemo(
    () => episodesByMovie[selectedMovieId] ?? [],
    [episodesByMovie, selectedMovieId],
  );
  const selectedEpisodeId = watch("episodeId");

  React.useEffect(() => {
    const episode = movieEpisodes.find((e) => e.id === selectedEpisodeId);
    if (episode) setValue("episodeNumber", String(episode.episodeNumber), { shouldDirty: false });
  }, [selectedEpisodeId, movieEpisodes, setValue]);

  function startEdit(event: ScheduleEvent) {
    setEditing(event);
    setMode("single");
    reset({
      movieId: event.movieId,
      episodeId: event.episodeId ?? "",
      episodeNumber: event.episodeNumber != null ? String(event.episodeNumber) : "",
      date: toLocalDateKey(event.scheduledAt),
      time: toLocalTimeKey(event.scheduledAt),
      status: event.status,
      note: event.note ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startCreate() {
    setEditing(null);
    reset({
      movieId: movies[0]?.id ?? "",
      episodeId: "",
      episodeNumber: "",
      date: todayKey,
      time: "20:00",
      status: "scheduled",
      note: "",
    });
  }

  function normalizeEpisodeId(value: string): string {
    return value === "__none__" ? "" : value;
  }

  const onSubmitSingle = handleSubmit(async (values) => {
    setServerError(null);
    setServerSuccess(null);

    const formData = new FormData();
    if (editing) formData.set("id", editing.id);
    formData.set("movieId", values.movieId);
    formData.set("episodeId", normalizeEpisodeId(values.episodeId));
    formData.set("episodeNumber", values.episodeNumber);
    formData.set("date", values.date);
    formData.set("time", values.time);
    formData.set("status", values.status);
    formData.set("note", values.note);

    const action = editing ? updateScheduleEventAction : createScheduleEventAction;
    const result = await action({}, formData);
    if (result?.error) {
      setServerError(result.error);
      toast(result.error, "error");
    } else {
      const msg = result?.success ?? "Đã lưu sự kiện lịch chiếu thành công.";
      setServerSuccess(msg);
      toast(msg, "success");
      startCreate();
      router.refresh();
    }
  });

  const onSubmitBatch = handleSubmit(async (values) => {
    setServerError(null);
    setServerSuccess(null);

    const formData = new FormData();
    formData.set("movieId", values.movieId);
    formData.set("episodeId", normalizeEpisodeId(values.episodeId));
    formData.set("episodeNumber", values.episodeNumber);
    formData.set("date", values.date);
    formData.set("time", values.time);
    formData.set("status", values.status);
    formData.set("note", values.note);
    formData.set("startDate", values.date);
    for (const day of selectedDays) formData.append("days", day);

    const result = await createScheduleBatchAction({}, formData);
    if (result?.error) {
      setServerError(result.error);
      toast(result.error, "error");
    }
    if (result?.success) {
      setServerSuccess(result.success);
      toast(result.success, "success");
      startCreate();
      router.refresh();
    }
  });

  const onSubmitDuplicate = handleSubmit(async () => {
    setServerError(null);
    setServerSuccess(null);

    const formData = new FormData();
    formData.set("sourceWeekStart", duplicateSource);
    formData.set("targetWeekStart", duplicateTarget);
    formData.set("confirm", duplicateConfirm ? "true" : "false");

    const result = await duplicateScheduleWeekAction({}, formData);
    if (result?.error) {
      setServerError(result.error);
      toast(result.error, "error");
    }
    if (result?.success) {
      setServerSuccess(result.success);
      toast(result.success, "success");
      setDuplicateConfirm(true);
      router.refresh();
    }
  });

  const grouped = groupByDay(events);

  return (
    <div className="space-y-8">
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

      {/* Form */}
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-parchment-100">
            {editing ? "Sửa sự kiện lịch" : "Thêm sự kiện lịch"}
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-ink-700 bg-ink-850 p-1">
              <button
                type="button"
                onClick={() => setMode("single")}
                aria-pressed={mode === "single"}
                className={`rounded px-3 py-1 text-xs transition-colors ${
                  mode === "single"
                    ? "bg-gold-500/15 text-gold-200"
                    : "text-parchment-300/85 hover:text-parchment-100"
                }`}
              >
                Một sự kiện
              </button>
              <button
                type="button"
                onClick={() => setMode("batch")}
                aria-pressed={mode === "batch"}
                className={`rounded px-3 py-1 text-xs transition-colors ${
                  mode === "batch"
                    ? "bg-gold-500/15 text-gold-200"
                    : "text-parchment-300/85 hover:text-parchment-100"
                }`}
              >
                Nhiều ngày
              </button>
            </div>
            {editing && (
              <Button type="button" variant="ghost" size="sm" onClick={startCreate}>
                Huỷ sửa
              </Button>
            )}
          </div>
        </div>

        {mode === "single" ? (
          <form onSubmit={onSubmitSingle} className="mt-5 space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="movieId">Phim</Label>
                <Select
                  value={selectedMovieId}
                  onValueChange={(value) => {
                    setValue("movieId", value, { shouldDirty: true });
                    setValue("episodeId", "", { shouldDirty: true });
                    setValue("episodeNumber", "", { shouldDirty: true });
                  }}
                >
                  <SelectTrigger id="movieId">
                    <SelectValue placeholder="Chọn phim" />
                  </SelectTrigger>
                  <SelectContent>
                    {movies.map((movie) => (
                      <SelectItem key={movie.id} value={movie.id}>
                        {movie.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.movieId && <p className="text-xs text-rouge-300">{errors.movieId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="episodeId">Tập (không bắt buộc)</Label>
                <Select
                  value={selectedEpisodeId}
                  onValueChange={(value) => setValue("episodeId", value, { shouldDirty: true })}
                >
                  <SelectTrigger id="episodeId">
                    <SelectValue placeholder="Chưa có tập" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Chưa có tập</SelectItem>
                    {movieEpisodes.map((episode) => (
                      <SelectItem key={episode.id} value={episode.id}>
                        Tập {episode.episodeNumber} — {episode.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="episodeNumber">Số tập dự kiến</Label>
                <Input
                  id="episodeNumber"
                  inputMode="numeric"
                  placeholder="Có thể để trống nếu tập chưa tạo"
                  {...register("episodeNumber")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date">Ngày</Label>
                <Input id="date" type="date" {...register("date")} />
                {errors.date && <p className="text-xs text-rouge-300">{errors.date.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="time">Giờ (Asia/Ho_Chi_Minh)</Label>
                <Input id="time" type="time" {...register("time")} />
                {errors.time && <p className="text-xs text-rouge-300">{errors.time.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Trạng thái</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(value) =>
                    setValue("status", value as "scheduled" | "aired" | "postponed")
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Dự kiến</SelectItem>
                    <SelectItem value="aired">Đã lên sóng</SelectItem>
                    <SelectItem value="postponed">Hoãn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="note">Ghi chú</Label>
                <Input id="note" placeholder="Ghi chú hiển thị trên lịch" {...register("note")} />
              </div>
            </div>

            <SubmitButton pending={isSubmitting} pendingLabel="Đang lưu…">
              {editing ? "Lưu thay đổi" : "Thêm sự kiện"}
            </SubmitButton>
          </form>
        ) : (
          <form onSubmit={onSubmitBatch} className="mt-5 space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="batch-movieId">Phim</Label>
                <Select
                  value={selectedMovieId}
                  onValueChange={(value) => {
                    setValue("movieId", value, { shouldDirty: true });
                    setValue("episodeId", "", { shouldDirty: true });
                    setValue("episodeNumber", "", { shouldDirty: true });
                  }}
                >
                  <SelectTrigger id="batch-movieId">
                    <SelectValue placeholder="Chọn phim" />
                  </SelectTrigger>
                  <SelectContent>
                    {movies.map((movie) => (
                      <SelectItem key={movie.id} value={movie.id}>
                        {movie.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="batch-episodeId">Tập (không bắt buộc)</Label>
                <Select
                  value={selectedEpisodeId}
                  onValueChange={(value) => setValue("episodeId", value, { shouldDirty: true })}
                >
                  <SelectTrigger id="batch-episodeId">
                    <SelectValue placeholder="Chưa có tập" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Chưa có tập</SelectItem>
                    {movieEpisodes.map((episode) => (
                      <SelectItem key={episode.id} value={episode.id}>
                        Tập {episode.episodeNumber} — {episode.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="batch-episodeNumber">Số tập dự kiến</Label>
                <Input
                  id="batch-episodeNumber"
                  inputMode="numeric"
                  {...register("episodeNumber")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="batch-date">Ngày đầu tiên trong tuần</Label>
                <Input id="batch-date" type="date" {...register("date")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="batch-time">Giờ áp dụng cho mọi ngày</Label>
                <Input id="batch-time" type="time" {...register("time")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="batch-status">Trạng thái</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(value) =>
                    setValue("status", value as "scheduled" | "aired" | "postponed")
                  }
                >
                  <SelectTrigger id="batch-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Dự kiến</SelectItem>
                    <SelectItem value="aired">Đã lên sóng</SelectItem>
                    <SelectItem value="postponed">Hoãn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-medium uppercase tracking-[0.14em] text-parchment-300/80">
                Ngày trong tuần
              </legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const active = selectedDays.includes(day.key);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setSelectedDays((prev) =>
                          prev.includes(day.key)
                            ? prev.filter((d) => d !== day.key)
                            : [...prev, day.key],
                        )
                      }
                      className={`size-10 rounded-md border text-xs transition-colors ${
                        active
                          ? "border-gold-500/60 bg-gold-500/12 text-gold-200"
                          : "border-ink-600 bg-ink-850 text-parchment-300/85 hover:border-ink-500"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-parchment-300/75">
                Ngày được tính từ “Ngày đầu tiên trong tuần” theo thứ tự Thứ hai → Chủ nhật.
              </p>
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="batch-note">Ghi chú</Label>
              <Input id="batch-note" {...register("note")} />
            </div>

            <SubmitButton pending={isSubmitting} pendingLabel="Đang tạo…">
              <CalendarPlus aria-hidden="true" />
              Tạo {selectedDays.length} sự kiện
            </SubmitButton>
          </form>
        )}
      </section>

      {/* Duplicate week */}
      <section className="panel p-5 sm:p-6">
        <h2 className="font-serif text-lg font-semibold text-parchment-100">Nhân bản lịch tuần</h2>
        <p className="mt-1.5 text-sm text-parchment-300/80">
          Sao chép toàn bộ sự kiện của một tuần sang tuần kế tiếp. Xem trước kết quả trước khi lưu.
        </p>

        <form onSubmit={onSubmitDuplicate} className="mt-4 space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="duplicate-source">Tuần nguồn (bắt đầu thứ hai)</Label>
              <Input
                id="duplicate-source"
                type="date"
                value={duplicateSource}
                onChange={(e) => {
                  setDuplicateSource(e.target.value);
                  setDuplicateConfirm(false);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duplicate-target">Tuần đích (bắt đầu thứ hai)</Label>
              <Input
                id="duplicate-target"
                type="date"
                value={duplicateTarget}
                onChange={(e) => {
                  setDuplicateTarget(e.target.value);
                  setDuplicateConfirm(false);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="duplicate-confirm"
              checked={duplicateConfirm}
              onCheckedChange={(checked) => setDuplicateConfirm(checked)}
            />
            <Label htmlFor="duplicate-confirm" className="normal-case tracking-normal">
              Tôi đã xem kết quả xem trước và muốn ghi vào cơ sở dữ liệu
            </Label>
          </div>

          <SubmitButton pendingLabel="Đang xử lý…" variant={duplicateConfirm ? "default" : "secondary"}>
            <Copy aria-hidden="true" />
            {duplicateConfirm ? "Nhân bản lịch" : "Xem trước"}
          </SubmitButton>
        </form>
      </section>

      {/* Event list */}
      <section className="space-y-4">
        <h2 className="font-serif text-lg font-semibold text-parchment-100">
          Toàn bộ sự kiện ({events.length})
        </h2>

        {events.length === 0 ? (
          <div className="panel px-6 py-12 text-center">
            <p className="font-serif text-base text-parchment-200">Chưa có sự kiện lịch chiếu</p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(([dayKey, dayEvents]) => (
              <section key={dayKey}>
                <h3 className="mb-2 border-b border-ink-700/70 pb-2 text-sm font-medium text-parchment-200">
                  {dayKey}
                  {dayKey === todayKey && (
                    <span className="ml-2 text-xs uppercase tracking-wider text-gold-300">
                      Hôm nay
                    </span>
                  )}
                </h3>
                <ul className="space-y-2">
                  {dayEvents.map((event) => (
                    <li
                      key={event.id}
                      className="panel flex flex-wrap items-center justify-between gap-3 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-parchment-100">
                          {event.movie?.title ?? "Phim"}
                          <span className="ml-2 text-xs text-parchment-300/80">
                            Tập {event.episodeNumber ?? "?"}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-mist-500">
                          {event.note ?? "Không có ghi chú"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            event.status === "aired"
                              ? "jade"
                              : event.status === "postponed"
                                ? "rouge"
                                : "gold"
                          }
                        >
                          {STATUS_LABELS[event.status]}
                        </Badge>
                        <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(event)}>
                          Sửa
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="Xoá sự kiện"
                          onClick={() => setPendingDelete(event)}
                        >
                          <Trash2 className="text-rouge-400" aria-hidden="true" />
                          <span className="sr-only">Xoá sự kiện</span>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Xoá sự kiện lịch chiếu?"
        description="Sự kiện này sẽ không còn xuất hiện trên lịch công khai."
        consequences={[
          "Lịch chiếu tuần tương ứng sẽ mất mục này.",
          "Thao tác không thể hoàn tác.",
        ]}
        confirmLabel="Xoá sự kiện"
        action={deleteScheduleEventAction}
        hiddenFields={
          pendingDelete ? { id: pendingDelete.id, confirm: pendingDelete.id } : undefined
        }
      />
    </div>
  );
}

function groupByDay(events: ScheduleEvent[]): Array<[string, ScheduleEvent[]]> {
  const map = new Map<string, ScheduleEvent[]>();
  for (const event of events) {
    const key = toLocalDateKey(event.scheduledAt);
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

const localFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function localParts(iso: string) {
  const parts = localFormatter.formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    date: `${get("year")}-${String(get("month")).padStart(2, "0")}-${String(get("day")).padStart(2, "0")}`,
    time: `${String(get("hour") === 24 ? 0 : get("hour")).padStart(2, "0")}:${String(get("minute")).padStart(2, "0")}`,
  };
}

function toLocalDateKey(iso: string): string {
  return localParts(iso).date;
}

function toLocalTimeKey(iso: string): string {
  return localParts(iso).time;
}
