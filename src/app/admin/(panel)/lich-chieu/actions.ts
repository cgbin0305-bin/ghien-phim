"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { invalidatePublicCache } from "@/lib/cache";
import { isDemoMode } from "@/lib/env";
import { fieldErrors, scheduleEventSchema } from "@/lib/validations/schemas";
import { addDays, toIsoFromLocalInput } from "@/lib/date";
import type { ActionState } from "@/lib/validations/action-state";

/**
 * Reads the shared schedule fields and converts the local `date` + `time`
 * inputs into an absolute instant (timestamptz) using the site timezone.
 */
function readScheduleForm(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  return {
    movieId: formData.get("movieId"),
    episodeId: formData.get("episodeId") ?? "",
    episodeNumber: formData.get("episodeNumber") ?? "",
    date,
    time,
    status: formData.get("status") ?? "scheduled",
    note: formData.get("note") ?? "",
  };
}

export async function createScheduleEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoMode) {
    return {
      error: "Chế độ demo: chưa cấu hình Supabase nên không thể lưu lịch chiếu.",
    };
  }

  await requireAdmin();

  const raw = readScheduleForm(formData);
  const parsed = scheduleEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ.", fieldErrors: fieldErrors(parsed.error) };
  }

  const store = await getStore();
  const data = parsed.data;

  try {
    await store.createScheduleEvent({
      movieId: data.movieId,
      episodeId: data.episodeId || null,
      episodeNumber: data.episodeNumber ?? null,
      scheduledAt: toIsoFromLocalInput(data.date, data.time),
      status: data.status,
      note: data.note || null,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể tạo sự kiện lịch chiếu.",
    };
  }

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/lich-chieu");
  revalidatePath("/admin/lich-chieu");
  return { success: "Đã thêm sự kiện lịch chiếu thành công." };
}

export async function updateScheduleEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoMode) {
    return { error: "Chế độ demo: chưa cấu hình Supabase nên không thể lưu thay đổi." };
  }

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu định danh sự kiện." };

  const raw = readScheduleForm(formData);
  const parsed = scheduleEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ.", fieldErrors: fieldErrors(parsed.error) };
  }

  const store = await getStore();
  const data = parsed.data;

  try {
    await store.updateScheduleEvent(id, {
      movieId: data.movieId,
      episodeId: data.episodeId || null,
      episodeNumber: data.episodeNumber ?? null,
      scheduledAt: toIsoFromLocalInput(data.date, data.time),
      status: data.status,
      note: data.note || null,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể cập nhật sự kiện lịch chiếu.",
    };
  }

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/lich-chieu");
  revalidatePath("/admin/lich-chieu");
  return { success: "Đã cập nhật sự kiện lịch chiếu thành công." };
}

/**
 * Creates the same event on several selected days.
 *
 * The admin picks the weekdays and a wall-clock time; each day becomes one
 * schedule event. Days that already contain an identical event are reported
 * back so the admin can decide before anything is written twice.
 */
export async function createScheduleBatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoMode) {
    return { error: "Chế độ demo: chưa cấu hình Supabase nên không thể lưu lịch chiếu." };
  }

  await requireAdmin();

  const movieId = String(formData.get("movieId") ?? "");
  const episodeId = String(formData.get("episodeId") ?? "") || null;
  const episodeNumberRaw = String(formData.get("episodeNumber") ?? "");
  const time = String(formData.get("time") ?? "");
  const status = String(formData.get("status") ?? "scheduled");
  const note = String(formData.get("note") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const days = formData.getAll("days").map(String);

  if (!movieId) return { error: "Vui lòng chọn phim." };
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "Giờ không hợp lệ." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { error: "Ngày bắt đầu không hợp lệ." };
  if (days.length === 0) return { error: "Vui lòng chọn ít nhất một ngày trong tuần." };

  const offsets: Record<string, number> = {
    mon: 0,
    tue: 1,
    wed: 2,
    thu: 3,
    fri: 4,
    sat: 5,
    sun: 6,
  };

  const chosen = days
    .map((d) => offsets[d.toLowerCase()])
    .filter((offset): offset is number => typeof offset === "number");
  if (chosen.length === 0) return { error: "Ngày trong tuần không hợp lệ." };

  const store = await getStore();
  const existing = await store.listAllScheduleEvents();

  // Detect duplicates: same movie, same time-of-day, same local date.
  const planned = chosen.map((offset) => addDays(startDate, offset));
  const duplicateDates: string[] = [];

  for (const dateKey of planned) {
    const existingOnDay = existing.filter((event) => {
      if (event.movieId !== movieId) return false;
      const eventLocal = new Date(event.scheduledAt);
      const local = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(eventLocal);
      const get = (type: string) => Number(local.find((p) => p.type === type)?.value);
      const eventDate = `${get("year")}-${String(get("month")).padStart(2, "0")}-${String(get("day")).padStart(2, "0")}`;
      const eventHour = String(get("hour") === 24 ? 0 : get("hour")).padStart(2, "0");
      const eventMinute = String(get("minute")).padStart(2, "0");
      return eventDate === dateKey && `${eventHour}:${eventMinute}` === time;
    });

    if (existingOnDay.length > 0) duplicateDates.push(dateKey);
  }

  if (duplicateDates.length === planned.length) {
    return {
      error: `Tất cả ${planned.length} ngày đã có sự kiện trùng giờ cho phim này. Không có gì được tạo.`,
    };
  }

  const episodeNumber = episodeNumberRaw ? Number(episodeNumberRaw) : null;
  let created = 0;

  for (const dateKey of planned) {
    if (duplicateDates.includes(dateKey)) continue;
    try {
      await store.createScheduleEvent({
        movieId,
        episodeId,
        episodeNumber: Number.isFinite(episodeNumber) ? episodeNumber : null,
        scheduledAt: toIsoFromLocalInput(dateKey, time),
        status: status as "scheduled" | "aired" | "postponed",
        note: note || null,
      });
      created += 1;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? `Đã tạo ${created} sự kiện trước đó, nhưng gặp lỗi: ${error.message}`
            : `Đã tạo ${created} sự kiện trước đó, nhưng gặp lỗi không xác định.`,
      };
    }
  }

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/lich-chieu");
  revalidatePath("/admin/lich-chieu");

  const skipped = duplicateDates.length;
  return {
    success:
      skipped > 0
        ? `Đã tạo ${created} sự kiện, bỏ qua ${skipped} ngày đã có sự kiện trùng giờ.`
        : `Đã tạo ${created} sự kiện lịch chiếu.`,
  };
}

/**
 * Copies every event of a source week into the next week.
 *
 * The copy is presented as a preview before saving. Episodes that already
 * exist in the target week are skipped so the operation is idempotent, and
 * the admin is told exactly what will be created.
 */
export async function duplicateScheduleWeekAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoMode) {
    return { error: "Chế độ demo: chưa cấu hình Supabase nên không thể nhân bản lịch." };
  }

  await requireAdmin();

  const sourceWeekStart = String(formData.get("sourceWeekStart") ?? "");
  const targetWeekStart = String(formData.get("targetWeekStart") ?? "");
  const confirmed = formData.get("confirm") === "true";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(sourceWeekStart) || !/^\d{4}-\d{2}-\d{2}$/.test(targetWeekStart)) {
    return { error: "Tuần nguồn hoặc tuần đích không hợp lệ." };
  }
  if (sourceWeekStart === targetWeekStart) {
    return { error: "Tuần đích phải khác tuần nguồn." };
  }

  const store = await getStore();
  const source = await store.getScheduleForWeek(sourceWeekStart);
  const target = await store.getScheduleForWeek(targetWeekStart);

  if (source.events.length === 0) {
    return { error: `Tuần ${sourceWeekStart} không có sự kiện nào để nhân bản.` };
  }

  // Build the plan: shift each source event by the week offset.
  const dayOffset = Math.round(
    (new Date(`${targetWeekStart}T00:00:00Z`).getTime() -
      new Date(`${sourceWeekStart}T00:00:00Z`).getTime()) /
      86_400_000,
  );

  interface PlanItem {
    sourceId: string;
    dateKey: string;
    time: string;
    movieId: string;
    movieTitle: string;
    episodeId: string | null;
    episodeNumber: number | null;
    status: string;
    note: string | null;
    duplicate: boolean;
  }

  const plan: PlanItem[] = source.events.map((event) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(event.scheduledAt));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const sourceDateKey = `${get("year")}-${String(get("month")).padStart(2, "0")}-${String(get("day")).padStart(2, "0")}`;
    const hour = get("hour") === 24 ? 0 : get("hour");
    const time = `${String(hour).padStart(2, "0")}:${String(get("minute")).padStart(2, "0")}`;

    const dateKey = addDays(sourceDateKey, dayOffset);
    const duplicate = target.events.some(
      (existing) =>
        existing.movieId === event.movieId &&
        toIsoFromLocalInput(dateKey, time) === existing.scheduledAt,
    );

    return {
      sourceId: event.id,
      dateKey,
      time,
      movieId: event.movieId,
      movieTitle: event.movie?.title ?? "Phim",
      episodeId: event.episodeId,
      episodeNumber: event.episodeNumber,
      status: event.status,
      note: event.note,
      duplicate,
    };
  });

  const toCreate = plan.filter((item) => !item.duplicate);
  const skipped = plan.length - toCreate.length;

  if (!confirmed) {
    // Preview mode: report the plan without writing anything.
    return {
      success:
        `Sẽ tạo ${toCreate.length} sự kiện trong tuần ${targetWeekStart}` +
        (skipped > 0 ? `, bỏ qua ${skipped} sự kiện đã tồn tại.` : ".") +
        " Xác nhận để lưu.",
    };
  }

  if (toCreate.length === 0) {
    return { error: "Toàn bộ sự kiện của tuần đích đã tồn tại. Không có gì được tạo." };
  }

  let created = 0;
  for (const item of toCreate) {
    try {
      await store.createScheduleEvent({
        movieId: item.movieId,
        episodeId: item.episodeId,
        episodeNumber: item.episodeNumber,
        scheduledAt: toIsoFromLocalInput(item.dateKey, item.time),
        status: item.status as "scheduled" | "aired" | "postponed",
        note: item.note,
      });
      created += 1;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? `Đã nhân bản ${created}/${toCreate.length} sự kiện trước khi gặp lỗi: ${error.message}`
            : `Đã nhân bản ${created}/${toCreate.length} sự kiện trước khi gặp lỗi.`,
      };
    }
  }

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/lich-chieu");
  revalidatePath("/admin/lich-chieu");

  return {
    success:
      `Đã nhân bản ${created} sự kiện sang tuần ${targetWeekStart}` +
      (skipped > 0 ? `, bỏ qua ${skipped} sự kiện trùng.` : "."),
  };
}

export async function deleteScheduleEventAction(formData: FormData): Promise<void> {
  if (isDemoMode) return;

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!id || confirm !== id) return;

  const store = await getStore();
  await store.deleteScheduleEvent(id);

  invalidatePublicCache();

  revalidatePath("/");
  revalidatePath("/lich-chieu");
  revalidatePath("/admin/lich-chieu");
}
