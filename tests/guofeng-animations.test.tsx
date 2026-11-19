// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VideoPlayer } from "@/components/player/video-player";
import { AmbientParticles } from "@/components/effects/ambient-particles";
import { StaggeredMovieGrid } from "@/components/effects/staggered-movie-grid";
import { SealStampButton } from "@/components/ui/seal-stamp-button";
import { ScrollUnfurlTrigger } from "@/components/movie/scroll-unfurl-modal";
import { MovieCard } from "@/components/movie/movie-card";
import { sortEpisodes } from "@/lib/episode-sort";
import type { MovieWithStats, VideoSource } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("@/app/actions/community", () => ({
  reportBrokenEpisodeAction: vi.fn().mockResolvedValue(undefined),
  getPublishedEpisodesByMovieIdAction: vi.fn().mockResolvedValue([
    {
      id: "ep-1",
      slug: "tap-1",
      title: "Tập 1",
      episodeNumber: 1,
    },
  ]),
}));

const sampleMovie: MovieWithStats = {
  id: "movie-1",
  slug: "van-kiem-lam-ngo",
  title: "Vấn Kiếm Lâm Ngô",
  originalTitle: "問劍臨吳",
  synopsis: "Hành trình tu tiên hỏi kiếm giữa giang hồ dậy sóng.",
  year: 2026,
  country: "Trung Quốc",
  director: "Lý Đạo Huyền",
  cast: ["Lâm Phong", "Tô Ngọc"],
  posterUrl: null,
  backdropUrl: null,
  trailerUrl: null,
  status: "published",
  releaseStatus: "airing",
  totalEpisodes: 24,
  subtitleLabel: "vietsub",
  isFeatured: true,
  sortOrder: 1,
  publishedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  genres: [{ id: "g-1", name: "Tiên Hiệp", slug: "tien-hiem", description: null, sortOrder: 1 }],
  episodeCount: 24,
  publishedEpisodeCount: 5,
};

const sampleSources: VideoSource[] = [
  {
    id: "src-1",
    episodeId: "ep-1",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    label: "Vietsub",
    priority: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("1. Chế độ Rạp Chiếu Cổ Phong (Cinema Dimmer / Lights Off)", () => {
  it("tạo lớp phủ rgba(0, 0, 0, 0.92), quầng sáng vàng kim trên khung phát và thoát khi bấm vùng tối bên ngoài", () => {
    const { container } = render(
      <VideoPlayer sources={sampleSources} title="Vấn Kiếm Lâm Ngô Tập 1" />,
    );

    const toggleBtn = screen.getByRole("button", { name: "Tắt đèn" });
    fireEvent.click(toggleBtn);

    const overlay = container.querySelector(".fixed.inset-0") as HTMLElement | null;
    expect(overlay).not.toBeNull();
    expect(overlay?.style.backgroundColor).toBe("rgba(0, 0, 0, 0.92)");

    const playerFrame = container.querySelector(".cinema-player-active") as HTMLElement | null;
    expect(playerFrame).not.toBeNull();
    expect(playerFrame?.style.boxShadow).toContain("rgba(212, 175, 55, 0.25)");

    // Bấm trực tiếp ra vùng tối bên ngoài để thoát chế độ rạp chiếu
    fireEvent.click(overlay!);
    expect(container.querySelector(".fixed.inset-0")).toBeNull();
  });
});

describe("2. Animation 1: Ambient Particles Canvas (Hoa Đào / Lá Phong / Đom Đóm)", () => {
  it("render thẻ HTML5 Canvas ở khu vực Hero Banner", () => {
    render(<AmbientParticles />);
    const canvas = screen.getByTestId("ambient-particles-canvas");
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName.toLowerCase()).toBe("canvas");
  });
});

describe("3. Animation 2: Thẻ Phim Hào Quang Kiếm Khí (Cultivation Movie Card)", () => {
  it("có lớp Border-Beam, poster zoom và nút Play hình Ấn Triện / Ngọc Bội phát sáng", () => {
    const { container } = render(<MovieCard movie={sampleMovie} />);

    expect(container.querySelector(".cultivation-card")).not.toBeNull();
    expect(container.querySelector(".cultivation-border-beam")).not.toBeNull();
    expect(container.querySelector(".jade-seal-play")).not.toBeNull();
  });
});

describe("4. Animation 3: Mở Chi Tiết Phim Kiểu Cuộn Tranh (Scroll Unfurl Modal)", () => {
  it("mở họa quyển với hiệu ứng bung cuộn tranh và hai trục gỗ trái - phải khi bấm nút Chi tiết", () => {
    render(<ScrollUnfurlTrigger movie={sampleMovie} label="Chi tiết" />);

    const trigger = screen.getByRole("button", { name: /Chi tiết phim Vấn Kiếm Lâm Ngô/i });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.querySelector(".scroll-unfurl-content")).not.toBeNull();
    expect(document.querySelector(".scroll-roller-left")).not.toBeNull();
    expect(document.querySelector(".scroll-roller-right")).not.toBeNull();
    expect(screen.getByText(/Hành trình tu tiên hỏi kiếm/i)).toBeInTheDocument();

    // Đóng bằng nút Đóng
    const closeBtn = screen.getByRole("button", { name: /Đóng cuộn tranh chi tiết phim/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("5. Animation 4: Nút Bấm Đóng Ấn Triện (Seal Stamp Click Effect)", () => {
  it("tạo sóng xung kích đỏ chu sa (seal-ripple-wave) và rung nhẹ (btn-seal-stamp-shaking) khi click", () => {
    const onClick = vi.fn();
    const { container } = render(
      <SealStampButton onClick={onClick}>Xem Ngay</SealStampButton>,
    );

    const btn = screen.getByRole("button", { name: "Xem Ngay" });
    fireEvent.click(btn, { clientX: 24, clientY: 16 });

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(btn.className).toContain("btn-seal-stamp-shaking");
    expect(container.querySelector(".seal-ripple-wave")).not.toBeNull();
  });
});

describe("6. Animation 5: Xuất Hiện Danh Sách Phim Kiểu Sương Khói (Staggered Fade-Up)", () => {
  it("bọc từng thẻ phim bằng lớp mist-stagger-item kèm độ trễ nối tiếp 60ms-80ms", () => {
    render(
      <StaggeredMovieGrid staggerMs={70}>
        <div key="1">Phim 1</div>
        <div key="2">Phim 2</div>
        <div key="3">Phim 3</div>
      </StaggeredMovieGrid>,
    );

    const grid = screen.getByTestId("staggered-movie-grid");
    const items = grid.querySelectorAll(".mist-stagger-item");
    expect(items).toHaveLength(3);
  });
});

describe("7. Sắp xếp tập phim tự nhiên (sortEpisodes 1 -> 23)", () => {
  it("luôn sắp xếp từ Tập 1 -> Tập 23 kể cả khi Tập 23 được thêm đầu tiên với STT = 1", () => {
    const outOfOrder = [
      { id: "ep-23", episodeNumber: 1, title: "Tập 23", slug: "tap-23" },
      { id: "ep-1", episodeNumber: 2, title: "Tập 1", slug: "tap-1" },
      { id: "ep-2", episodeNumber: 3, title: "Tập 2", slug: "tap-2" },
      { id: "ep-10", episodeNumber: 4, title: "Tập 10", slug: "tap-10" },
      { id: "ep-5-2", episodeNumber: 5, title: "Tập 5 - Phần 2", slug: "tap-5-phan-2" },
      { id: "ep-5-1", episodeNumber: 6, title: "Tập 5 - Phần 1", slug: "tap-5-phan-1" },
      { id: "ep-22", episodeNumber: 7, title: "Tập 22", slug: "tap-22" },
    ];

    const sorted = sortEpisodes(outOfOrder);
    expect(sorted.map((e) => e.title)).toEqual([
      "Tập 1",
      "Tập 2",
      "Tập 5 - Phần 1",
      "Tập 5 - Phần 2",
      "Tập 10",
      "Tập 22",
      "Tập 23",
    ]);
  });
});
