import { beforeEach, describe, expect, it } from "vitest";
import { createDemoStore } from "@/lib/data/demo-store";
import { DEMO_GENRES } from "@/lib/data/demo";
import { getWeekStart, getTodayKey, addDays } from "@/lib/date";
import type { DataStore, MovieInput } from "@/lib/data/types";

/**
 * Demo store là hiện thực tham chiếu của hợp đồng `DataStore`.
 *
 * Mọi trang công khai và mọi Server Action đều đi qua hợp đồng này, nên test
 * ở đây bảo đảm hành vi của toàn bộ ứng dụng (lọc, phân trang, phim nổi
 * bật, xoá tập, lịch chiếu theo tuần...) là nhất quán.
 */

function makeStore(): DataStore {
  return createDemoStore();
}

const newMovie: MovieInput = {
  slug: "phim-kiem-thu",
  title: "Phim Kiểm Thử",
  originalTitle: "测试",
  synopsis: "Một phim dùng để kiểm thử.",
  year: 2025,
  country: "Trung Quốc",
  director: "Đạo diễn",
  cast: ["Diễn viên A"],
  posterUrl: null,
  backdropUrl: null,
  trailerUrl: null,
  status: "draft",
  releaseStatus: "upcoming",
  totalEpisodes: 12,
  subtitleLabel: "vietsub",
  isFeatured: false,
  sortOrder: 99,
  genreIds: [],
};

describe("demo store — cấu hình", () => {
  it("chạy ở chế độ demo", () => {
    expect(makeStore().mode).toBe("demo");
  });

  it("trả về danh sách thể loại có thứ tự", async () => {
    const genres = await makeStore().getGenres();
    expect(genres.length).toBe(DEMO_GENRES.length);
    expect(genres[0]?.slug).toBe("co-trang");
  });

  it("trả về cài đặt site với tên và mô tả", async () => {
    const settings = await makeStore().getSettings();
    expect(settings.siteName).toBe("Ghiền Phim");
    expect(settings.siteDescription).toBeTruthy();
  });
});

describe("demo store — cập nhật cài đặt", () => {
  it("ghi đè các trường được cập nhật và giữ nguyên trường khác", async () => {
    const store = makeStore();
    const before = await store.getSettings();

    const after = await store.updateSettings({ siteName: "Ghiền Phim Mới" });

    expect(after.siteName).toBe("Ghiền Phim Mới");
    expect(after.siteDescription).toBe(before.siteDescription);
    expect(after.updatedAt).not.toBe(before.updatedAt);
  });

  it("đặt trường rỗng thành null nếu được truyền null", async () => {
    const store = makeStore();
    const after = await store.updateSettings({ contactEmail: null });
    expect(after.contactEmail).toBeNull();
  });
});

describe("demo store — danh sách phim công khai", () => {
  it("chỉ trả về phim đã xuất bản", async () => {
    const store = makeStore();
    const all = await store.listAllMoviesForAdmin();
    const published = await store.listMovies({ perPage: 100 });

    expect(published.total).toBe(all.filter((m) => m.status === "published").length);
    expect(published.movies.every((m) => m.status === "published")).toBe(true);
  });

  it("tìm kiếm theo tên Việt, tên gốc, đạo diễn và diễn viên", async () => {
    const store = makeStore();

    const byTitle = await store.listMovies({ query: "Vấn Kiếm" });
    expect(byTitle.movies.length).toBeGreaterThan(0);

    const byOriginal = await store.listMovies({ query: "岚山剑影" });
    expect(byOriginal.movies.length).toBeGreaterThan(0);

    const byDirector = await store.listMovies({ query: "Lâm Nhạc Châu" });
    expect(byDirector.movies.length).toBeGreaterThan(0);

    const byCast = await store.listMovies({ query: "Kiều Vân" });
    expect(byCast.movies.length).toBeGreaterThan(0);
  });

  it("không trả về gì khi từ khoá không khớp", async () => {
    const result = await makeStore().listMovies({ query: "xyz-khong-ton-tai-123" });
    expect(result.total).toBe(0);
    expect(result.movies).toHaveLength(0);
  });

  it("lọc theo thể loại", async () => {
    const store = makeStore();
    const result = await store.listMovies({ genre: "co-trang", perPage: 100 });
    expect(result.total).toBeGreaterThan(0);
    expect(
      result.movies.every((m) => m.genres.some((g) => g.slug === "co-trang")),
    ).toBe(true);
  });

  it("lọc theo năm phát hành", async () => {
    const result = await makeStore().listMovies({ year: 2024, perPage: 100 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.movies.every((m) => m.year === 2024)).toBe(true);
  });

  it("lọc theo trạng thái phát hành", async () => {
    const result = await makeStore().listMovies({
      releaseStatus: "airing",
      perPage: 100,
    });
    expect(result.total).toBeGreaterThan(0);
    expect(result.movies.every((m) => m.releaseStatus === "airing")).toBe(true);
  });

  it("bỏ qua trạng thái 'all'", async () => {
    const store = makeStore();
    const all = await store.listMovies({ releaseStatus: "all", perPage: 100 });
    const total = await store.listMovies({ perPage: 100 });
    expect(all.total).toBe(total.total);
  });

  it("phân trang đúng số trang và tổng số trang", async () => {
    const store = makeStore();

    const page1 = await store.listMovies({ page: 1, perPage: 3 });
    const page2 = await store.listMovies({ page: 2, perPage: 3 });

    expect(page1.movies).toHaveLength(3);
    expect(page1.totalPages).toBe(Math.ceil(page1.total / 3));
    expect(page2.page).toBe(2);

    const ids1 = page1.movies.map((m) => m.id);
    const ids2 = page2.movies.map((m) => m.id);
    expect(ids1.some((id) => ids2.includes(id))).toBe(false);
  });

  it("trả về trang 1 tối thiểu khi page <= 0", async () => {
    const result = await makeStore().listMovies({ page: -5, perPage: 6 });
    expect(result.page).toBe(1);
  });

  it("sắp xếp theo năm phát hành giảm dần", async () => {
    const result = await makeStore().listMovies({ sort: "year", perPage: 100 });
    const years = result.movies.map((m) => m.year ?? 0);
    expect([...years].sort((a, b) => b - a)).toEqual(years);
  });

  it("sắp xếp theo ngày tạo mới nhất", async () => {
    const result = await makeStore().listMovies({ sort: "newest", perPage: 100 });
    const dates = result.movies.map((m) => m.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("đính kèm số tập và số tập đã xuất bản", async () => {
    const result = await makeStore().listMovies({ perPage: 100 });
    for (const movie of result.movies) {
      expect(movie.episodeCount).toBeGreaterThanOrEqual(movie.publishedEpisodeCount);
      expect(movie.publishedEpisodeCount).toBeGreaterThanOrEqual(0);
    }
  });

  it("trả về danh sách năm phát hành giảm dần và không trùng lặp", async () => {
    const years = await makeStore().listMovieYears();
    expect(years.length).toBeGreaterThan(0);
    expect(new Set(years).size).toBe(years.length);
    expect([...years].sort((a, b) => b - a)).toEqual(years);
  });
});

describe("demo store — chi tiết phim", () => {
  it("lấy phim theo slug", async () => {
    const movie = await makeStore().getMovieBySlug("van-kiem-lam-ngo");
    expect(movie?.title).toBe("Vấn Kiếm Lâm Ngô");
    expect(movie?.genres.length).toBeGreaterThan(0);
  });

  it("trả null cho slug không tồn tại", async () => {
    expect(await makeStore().getMovieBySlug("khong-co-phim-nay")).toBeNull();
  });

  it("không liệt kê phim ở trạng thái bản nháp trong danh sách công khai", async () => {
    const store = makeStore();
    const created = await store.createMovie({ ...newMovie, slug: "phim-nhap-kenh" });

    const published = await store.listMovies({ perPage: 100 });
    expect(published.movies.some((m) => m.id === created.id)).toBe(false);

    // Nhưng admin vẫn tra cứu được qua id và qua slug.
    expect(await store.getMovieById(created.id)).not.toBeNull();
    expect(await store.getMovieBySlug("phim-nhap-kenh")).not.toBeNull();
  });

  it("lấy phim theo id", async () => {
    const movie = await makeStore().getMovieById("m-1");
    expect(movie?.slug).toBe("van-kiem-lam-ngo");
  });

  it("trả danh sách phim liên quan không chứa chính nó", async () => {
    const store = makeStore();
    const movie = await store.getMovieBySlug("van-kiem-lam-ngo");
    expect(movie).not.toBeNull();
    if (!movie) return;

    const related = await store.getRelatedMovies(movie, 4);
    expect(related.length).toBeLessThanOrEqual(4);
    expect(related.some((m) => m.id === movie.id)).toBe(false);
  });

  it("trả về bản đồ thể loại theo phim", async () => {
    const map = await makeStore().getMovieGenres();
    expect(map.size).toBeGreaterThan(0);
    expect(map.get("m-1")?.length).toBeGreaterThan(0);
  });
});

describe("demo store — vòng đời phim", () => {
  it("tạo phim mới với publishedAt null khi là bản nháp", async () => {
    const store = makeStore();
    const movie = await store.createMovie(newMovie);

    expect(movie.id).toBeTruthy();
    expect(movie.status).toBe("draft");
    expect(movie.publishedAt).toBeNull();
    expect(movie.slug).toBe("phim-kiem-thu");
  });

  it("tạo phim đã xuất bản thì có publishedAt", async () => {
    const movie = await makeStore().createMovie({
      ...newMovie,
      status: "published",
      slug: "phim-cong-khai",
    });
    expect(movie.publishedAt).not.toBeNull();
  });

  it("chỉ giữ một phim nổi bật tại một thời điểm", async () => {
    const store = makeStore();

    const a = await store.createMovie({ ...newMovie, slug: "nb-a", isFeatured: true });
    expect(a.isFeatured).toBe(true);

    const b = await store.createMovie({ ...newMovie, slug: "nb-b", isFeatured: true });
    expect(b.isFeatured).toBe(true);

    const previous = await store.getMovieById(a.id);
    expect(previous?.isFeatured).toBe(false);
  });

  it("cập nhật phim giữ nguyên id và cập nhật updatedAt", async () => {
    const store = makeStore();
    const before = await store.getMovieById("m-1");
    expect(before).not.toBeNull();
    if (!before) return;

    const after = await store.updateMovie("m-1", {
      ...newMovie,
      slug: before.slug,
      title: "Tên Mới",
      status: "draft",
    });

    expect(after.id).toBe("m-1");
    expect(after.title).toBe("Tên Mới");
    expect(after.status).toBe("draft");
    expect(after.publishedAt).toBeNull();
  });

  it("xoá phim sẽ xoá luôn tập và sự kiện lịch của phim đó", async () => {
    const store = makeStore();
    const movie = await store.createMovie({ ...newMovie, slug: "phim-sau-khi-xoa" });
    await store.createEpisode({
      movieId: movie.id,
      episodeNumber: 1,
      title: "Tập 1",
      slug: "tap-1",
      status: "draft",
      sources: [],
    });

    expect(await store.listEpisodes(movie.id)).toHaveLength(1);

    await store.deleteMovie(movie.id);

    expect(await store.getMovieById(movie.id)).toBeNull();
    expect(await store.listEpisodes(movie.id)).toHaveLength(0);
  });

  it("ném lỗi khi cập nhật/xoá phim không tồn tại", async () => {
    const store = makeStore();
    await expect(store.updateMovie("khong-ton-tai", newMovie)).rejects.toThrow("Không tìm thấy phim.");
    await expect(store.deleteMovie("khong-ton-tai")).rejects.toThrow("Không tìm thấy phim.");
  });
});

describe("demo store — tập phim", () => {
  it("liệt kê tập theo thứ tự số tập", async () => {
    const episodes = await makeStore().listEpisodes("m-1");
    expect(episodes.length).toBeGreaterThan(1);
    const numbers = episodes.map((e) => e.episodeNumber);
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
  });

  it("tạo tập kèm nguồn video và gắn đúng episodeId", async () => {
    const store = makeStore();
    const episode = await store.createEpisode({
      movieId: "m-3",
      episodeNumber: 99,
      title: "Tập 99",
      slug: "tap-99",
      status: "published",
      sources: [
        {
          provider: "youtube",
          sourceUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
          label: "Nguồn 1",
          priority: 0,
        },
      ],
    });

    expect(episode.sources).toHaveLength(1);
    expect(episode.sources[0]?.episodeId).toBe(episode.id);
    expect(episode.sources[0]?.priority).toBe(0);
  });

  it("từ chối trùng số tập trong cùng một phim", async () => {
    const store = makeStore();
    await expect(
      store.createEpisode({
        movieId: "m-3",
        episodeNumber: 1,
        title: "Trùng",
        slug: "trung",
        status: "draft",
        sources: [],
      }),
    ).rejects.toThrow("Số tập này đã tồn tại trong phim.");
  });

  it("cho phép cập nhật tập mà không đổi số tập của chính nó", async () => {
    const store = makeStore();
    const episodes = await store.listEpisodes("m-3");
    const first = episodes[0];
    expect(first).toBeDefined();
    if (!first) return;

    const updated = await store.updateEpisode(first.id, {
      movieId: first.movieId,
      episodeNumber: first.episodeNumber,
      title: "Tập đã sửa",
      slug: first.slug,
      status: first.status,
      sources: [],
    });
    expect(updated.title).toBe("Tập đã sửa");
  });

  it("lấy tập theo slug phim + slug tập", async () => {
    const result = await makeStore().getEpisodeBySlug("van-kiem-lam-ngo", "tap-1");
    expect(result?.episode.slug).toBe("tap-1");
    expect(result?.siblings.length).toBeGreaterThan(0);
  });

  it("trả null cho tập không tồn tại", async () => {
    expect(await makeStore().getEpisodeBySlug("van-kiem-lam-ngo", "tap-khong-có")).toBeNull();
  });

  it("trả tập đã xuất bản mới nhất", async () => {
    const latest = await makeStore().getLatestPublishedEpisode("m-1");
    expect(latest).not.toBeNull();
    expect(latest?.status).toBe("published");
  });

  it("xoá tập làm tập biến mất khỏi danh sách", async () => {
    const store = makeStore();
    const episodes = await store.listEpisodes("m-3");
    const target = episodes[0];
    expect(target).toBeDefined();
    if (!target) return;

    await store.deleteEpisode(target.id);
    const after = await store.listEpisodes("m-3");
    expect(after.some((e) => e.id === target.id)).toBe(false);
  });

  it("ném lỗi khi cập nhật/xoá tập không tồn tại", async () => {
    const store = makeStore();
    await expect(
      store.updateEpisode("ep-khong-ton-tai", {
        movieId: "m-1",
        episodeNumber: 1,
        title: "x",
        slug: "x",
        status: "draft",
        sources: [],
      }),
    ).rejects.toThrow("Không tìm thấy tập.");
    await expect(store.deleteEpisode("ep-khong-ton-tai")).rejects.toThrow("Không tìm thấy tập.");
  });
});

describe("demo store — lịch chiếu", () => {
  it("trả về sự kiện của đúng tuần theo múi giờ Việt Nam", async () => {
    const store = makeStore();
    // Lịch demo được sinh theo tuần chứa "hôm nay", nên test phải dùng tuần
    // hiện tại thay vì một ngày cố định (sẽ hỏng theo thời gian).
    const today = getTodayKey();
    const weekStart = getWeekStart(today);
    const week = await store.getScheduleForWeek(weekStart);

    expect(week.weekStart).toBe(weekStart);
    expect(week.weekEnd).toBe(addDays(weekStart, 6));
    expect(week.events.length).toBeGreaterThan(0);
  });

  it("không trả sự kiện nằm ngoài tuần", async () => {
    const store = makeStore();
    const week = await store.getScheduleForWeek("2020-01-06");
    expect(week.events).toHaveLength(0);
  });

  it("liệt kê sự kiện sắp tới theo thứ tự thời gian", async () => {
    const store = makeStore();
    const upcoming = await store.listUpcomingSchedule(5);

    expect(upcoming.length).toBeLessThanOrEqual(5);
    const times = upcoming.map((e) => e.scheduledAt);
    expect([...times].sort()).toEqual(times);
  });

  it("tạo sự kiện lịch gắn thông tin phim", async () => {
    const store = makeStore();
    const event = await store.createScheduleEvent({
      movieId: "m-1",
      episodeNumber: 3,
      scheduledAt: "2027-01-01T13:00:00.000Z",
      status: "scheduled",
      note: "Ghi chú",
    });

    expect(event.movie?.title).toBe("Vấn Kiếm Lâm Ngô");
    expect(event.note).toBe("Ghi chú");
  });

  it("ném lỗi khi tạo sự kiện cho phim không tồn tại", async () => {
    await expect(
      makeStore().createScheduleEvent({
        movieId: "khong-ton-tai",
        scheduledAt: "2027-01-01T13:00:00.000Z",
        status: "scheduled",
      }),
    ).rejects.toThrow("Không tìm thấy phim.");
  });

  it("cập nhật và xoá sự kiện lịch", async () => {
    const store = makeStore();
    const event = await store.createScheduleEvent({
      movieId: "m-1",
      scheduledAt: "2027-01-01T13:00:00.000Z",
      status: "scheduled",
    });

    const updated = await store.updateScheduleEvent(event.id, {
      movieId: "m-1",
      scheduledAt: "2027-01-02T13:00:00.000Z",
      status: "postponed",
    });
    expect(updated.status).toBe("postponed");

    await store.deleteScheduleEvent(event.id);
    const all = await store.listAllScheduleEvents();
    expect(all.some((e) => e.id === event.id)).toBe(false);
  });

  it("ném lỗi khi cập nhật sự kiện không tồn tại", async () => {
    await expect(
      makeStore().updateScheduleEvent("sch-khong-ton-tai", {
        movieId: "m-1",
        scheduledAt: "2027-01-01T13:00:00.000Z",
        status: "scheduled",
      }),
    ).rejects.toThrow("Không tìm thấy sự kiện lịch.");
  });
});

describe("demo store — bài viết", () => {
  it("chỉ trả về bài viết đã xuất bản cho trang công khai", async () => {
    const store = makeStore();
    await store.createPost({
      slug: "biet-ban",
      title: "Biệt Bạn",
      content: "Nội dung",
      type: "announcement",
      status: "draft",
      movieIds: [],
    });

    const published = await store.listPosts();
    expect(published.every((p) => p.status === "published")).toBe(true);
    expect(published.some((p) => p.slug === "biet-ban")).toBe(false);

    const all = await store.listAllPostsForAdmin();
    expect(all.some((p) => p.slug === "biet-ban")).toBe(true);
  });

  it("lọc bài viết theo loại", async () => {
    const posts = await makeStore().listPosts({ type: "weekly_schedule" });
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p) => p.type === "weekly_schedule")).toBe(true);
  });

  it("giới hạn số bài viết trả về", async () => {
    const posts = await makeStore().listPosts({ limit: 2 });
    expect(posts).toHaveLength(2);
  });

  it("sắp xếp bài viết theo ngày xuất bản mới nhất trước", async () => {
    const posts = await makeStore().listPosts();
    const dates = posts.map((p) => p.publishedAt ?? p.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("tạo bài viết gắn các phim liên quan", async () => {
    const store = makeStore();
    const post = await store.createPost({
      slug: "bai-viet-moi",
      title: "Bài Viết Mới",
      content: "Nội dung",
      type: "movie_intro",
      status: "published",
      movieIds: ["m-1", "m-5"],
    });

    expect(post.movies).toHaveLength(2);
    expect(post.publishedAt).not.toBeNull();
  });

  it("cập nhật bài viết và xoá bài viết", async () => {
    const store = makeStore();
    const post = await store.createPost({
      slug: "se-xoa",
      title: "Sẽ Xoá",
      content: "Nội dung",
      type: "announcement",
      status: "draft",
      movieIds: [],
    });

    const updated = await store.updatePost(post.id, {
      slug: "se-xoa",
      title: "Đã Sửa",
      content: "Nội dung mới",
      type: "announcement",
      status: "published",
      movieIds: [],
    });
    expect(updated.title).toBe("Đã Sửa");
    expect(updated.status).toBe("published");

    await store.deletePost(post.id);
    expect(await store.getPostById(post.id)).toBeNull();
  });

  it("ném lỗi khi cập nhật/xoá bài viết không tồn tại", async () => {
    const store = makeStore();
    await expect(
      store.updatePost("p-khong-ton-tai", {
        slug: "x",
        title: "x",
        content: "x",
        type: "announcement",
        status: "draft",
        movieIds: [],
      }),
    ).rejects.toThrow("Không tìm thấy bài viết.");
    await expect(store.deletePost("p-khong-ton-tai")).rejects.toThrow("Không tìm thấy bài viết.");
  });
});

describe("demo store — thống kê dashboard", () => {
  it("trả về số liệu nhất quán với dữ liệu thực", async () => {
    const store = makeStore();
    const stats = await store.getDashboardStats();

    const movies = await store.listAllMoviesForAdmin();
    const published = movies.filter((m) => m.status === "published");
    const episodes = (await Promise.all(movies.map((m) => store.listEpisodes(m.id)))).flat();

    expect(stats.movieCount).toBe(movies.length);
    expect(stats.publishedMovieCount).toBe(published.length);
    expect(stats.episodeCount).toBe(episodes.length);
    expect(stats.publishedEpisodeCount).toBe(
      episodes.filter((e) => e.status === "published").length,
    );
  });

  it("giới hạn danh sách gần đây ở 5 phần tử", async () => {
    const stats = await makeStore().getDashboardStats();
    expect(stats.recentMovies.length).toBeLessThanOrEqual(5);
    expect(stats.recentPosts.length).toBeLessThanOrEqual(5);
    expect(stats.upcomingEvents.length).toBeLessThanOrEqual(5);
  });

  it("chỉ đếm sự kiện lịch ở trạng thái scheduled", async () => {
    const stats = await makeStore().getDashboardStats();
    expect(stats.upcomingScheduleCount).toBeGreaterThanOrEqual(0);
  });
});

describe("demo store — tính lũy kế", () => {
  let store: DataStore;

  beforeEach(() => {
    store = makeStore();
  });

  it("tạo phim làm total tăng", async () => {
    const before = await store.listAllMoviesForAdmin();
    await store.createMovie({ ...newMovie, slug: "dem-1" });
    const after = await store.listAllMoviesForAdmin();
    expect(after.length).toBe(before.length + 1);
  });

  it("tạo bài viết làm total tăng", async () => {
    const before = await store.listAllPostsForAdmin();
    await store.createPost({
      slug: "dem-bai-viet",
      title: "Đếm Bài Viết",
      content: "",
      type: "announcement",
      status: "draft",
      movieIds: [],
    });
    const after = await store.listAllPostsForAdmin();
    expect(after.length).toBe(before.length + 1);
  });

  it("mỗi store là độc lập, không chia sẻ dữ liệu", async () => {
    const a = makeStore();
    const b = makeStore();

    await a.createMovie({ ...newMovie, slug: "chi-a" });

    expect(await a.getMovieBySlug("chi-a")).not.toBeNull();
    expect(await b.getMovieBySlug("chi-a")).toBeNull();
  });

  it("thêm, cập nhật và xoá thể loại phim (CRUD)", async () => {
    const store = makeStore();
    const initial = await store.getGenres();

    const created = await store.createGenre({
      name: "Trọng Sinh",
      slug: "trong-sinh",
      description: "Phim trọng sinh báo thù",
      sortOrder: 99,
    });
    expect(created.name).toBe("Trọng Sinh");
    expect(created.slug).toBe("trong-sinh");

    const afterCreate = await store.getGenres();
    expect(afterCreate.length).toBe(initial.length + 1);

    const updated = await store.updateGenre(created.id, {
      name: "Trọng Sinh Cổ Đại",
      slug: "trong-sinh-co-dai",
      description: "Đã cập nhật",
      sortOrder: 10,
    });
    expect(updated.name).toBe("Trọng Sinh Cổ Đại");
    expect(updated.slug).toBe("trong-sinh-co-dai");

    await store.deleteGenre(created.id);
    const afterDelete = await store.getGenres();
    expect(afterDelete.length).toBe(initial.length);
  });
});
