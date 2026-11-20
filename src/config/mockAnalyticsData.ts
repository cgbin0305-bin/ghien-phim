/**
 * Bộ dữ liệu phân tích mẫu & cấu hình kiểu dữ liệu cho Trung Tâm Phân Tích
 * và Công Cụ Quét Sức Khỏe Link Tự Động (Auto Link Health Check).
 *
 * Thiết kế sát với thực tế vận hành website phim AI Cổ Trang / Tiên Hiệp.
 */

export type TimeRangeKey = "today" | "7d" | "30d";

export type LinkStatus = "idle" | "checking" | "active" | "broken" | "manual_check";

export interface KpiCardMetric {
  value: number;
  formattedValue: string;
  changePercent: number;
  subLabel: string;
}

export interface TrendDataPoint {
  date: string;
  views: number;
  donateClicks: number;
}

export interface EpisodeRetentionPoint {
  episodeNumber: number;
  episodeTitle: string;
  views: number;
  dropOffPercent: number;
}

export interface MovieAnalytics {
  movieId: string;
  movieSlug: string;
  title: string;
  originalTitle: string;
  genre: string;
  totalViews: number;
  activeVisitors: number;
  donateClicks: number;
  donateCtr: number;
  avgRetentionEpisode: number;
  totalEpisodes: number;
  retentionRate: number;
  episodeDropOff: EpisodeRetentionPoint[];
}

export interface SearchKeywordStat {
  keyword: string;
  category: "Từ khóa" | "Thể loại" | "Nhân vật";
  count: number;
  trendPercent: number;
}

export interface DashboardStats {
  timeRange: TimeRangeKey;
  totalViews: KpiCardMetric;
  activeVisitors: KpiCardMetric;
  donateClicks: KpiCardMetric & { ctrPercent: number };
  retentionRate: KpiCardMetric & { avgStopEpisode: string };
  trendSeries: TrendDataPoint[];
  topMovies: MovieAnalytics[];
  topKeywords: SearchKeywordStat[];
}

export interface LinkCheckResult {
  id: string;
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  episodeId: string;
  episodeNumber: number;
  episodeTitle: string;
  serverLabel: string;
  provider: "youtube" | "facebook";
  sourceUrl: string;
  status: LinkStatus;
  httpCode: number | null;
  statusMessage: string;
  checkedAt: string | null;
}

export const MOCK_MOVIE_ANALYTICS: MovieAnalytics[] = [
  {
    movieId: "m-tien-nghich-ai",
    movieSlug: "tien-nghich-vinh-hang",
    title: "Tiên Nghịch: Vĩnh Hằng Kiếm Vực",
    originalTitle: "仙逆·永恒剑域",
    genre: "Tiên hiệp · Tu chân",
    totalViews: 48620,
    activeVisitors: 19450,
    donateClicks: 1420,
    donateCtr: 2.92,
    avgRetentionEpisode: 10.4,
    totalEpisodes: 12,
    retentionRate: 78.5,
    episodeDropOff: [
      { episodeNumber: 1, episodeTitle: "Tập 1 · Phàm Nhân Nhập Đạo", views: 6850, dropOffPercent: 0 },
      { episodeNumber: 2, episodeTitle: "Tập 2 · Linh Căn Thức Tỉnh", views: 6420, dropOffPercent: 6.3 },
      { episodeNumber: 3, episodeTitle: "Tập 3 · Huyết Chiến Hằng Nhạc", views: 5980, dropOffPercent: 6.9 },
      { episodeNumber: 4, episodeTitle: "Tập 4 · Thiên Nghịch Châu", views: 5640, dropOffPercent: 5.7 },
      { episodeNumber: 5, episodeTitle: "Tập 5 · Trúc Cơ Kiếp Lôi", views: 5290, dropOffPercent: 6.2 },
      { episodeNumber: 6, episodeTitle: "Tập 6 · Vực Ngoại Ma Ảnh", views: 4410, dropOffPercent: 16.6 },
      { episodeNumber: 7, episodeTitle: "Tập 7 · Cực Cảnh Thần Thức", views: 4120, dropOffPercent: 6.6 },
      { episodeNumber: 8, episodeTitle: "Tập 8 · Tu Ma Hải", views: 3910, dropOffPercent: 5.1 },
      { episodeNumber: 9, episodeTitle: "Tập 9 · Hóa Thần Chi Lộ", views: 3760, dropOffPercent: 3.8 },
      { episodeNumber: 10, episodeTitle: "Tập 10 · Vạn Hồn幡 Xuất Thế", views: 3610, dropOffPercent: 4.0 },
      { episodeNumber: 11, episodeTitle: "Tập 11 · Cổ Thần Chi Địa", views: 3490, dropOffPercent: 3.3 },
      { episodeNumber: 12, episodeTitle: "Tập 12 · Nhất Niệm Tinh Không", views: 3380, dropOffPercent: 3.2 },
    ],
  },
  {
    movieId: "m-van-kiem-lam-ngo",
    movieSlug: "van-kiem-lam-ngo",
    title: "Vấn Kiếm Lâm Ngô",
    originalTitle: "岚山剑影",
    genre: "Kiếm hiệp · Cổ trang",
    totalViews: 39240,
    activeVisitors: 15800,
    donateClicks: 1095,
    donateCtr: 2.79,
    avgRetentionEpisode: 8.6,
    totalEpisodes: 10,
    retentionRate: 74.2,
    episodeDropOff: [
      { episodeNumber: 1, episodeTitle: "Tập 1 · Tuyết Lạc Lâm Sơn", views: 5900, dropOffPercent: 0 },
      { episodeNumber: 2, episodeTitle: "Tập 2 · Tàn Kiếm Xuất Khiếu", views: 5480, dropOffPercent: 7.1 },
      { episodeNumber: 3, episodeTitle: "Tập 3 · Dạ Vũ Giang Hồ", views: 5120, dropOffPercent: 6.6 },
      { episodeNumber: 4, episodeTitle: "Tập 4 · Phong Vân Kiếm Các", views: 4320, dropOffPercent: 15.6 },
      { episodeNumber: 5, episodeTitle: "Tập 5 · Tuyệt Đỉnh Giao Phong", views: 3980, dropOffPercent: 7.9 },
      { episodeNumber: 6, episodeTitle: "Tập 6 · Huyết Nhuộm Phong Hoa", views: 3740, dropOffPercent: 6.0 },
      { episodeNumber: 7, episodeTitle: "Tập 7 · Mật Chỉ Cung Đình", views: 3550, dropOffPercent: 5.1 },
      { episodeNumber: 8, episodeTitle: "Tập 8 · Vạn Kiếm Quy Tông", views: 3390, dropOffPercent: 4.5 },
      { episodeNumber: 9, episodeTitle: "Tập 9 · Sinh Tử Nhất Kiếm", views: 3250, dropOffPercent: 4.1 },
      { episodeNumber: 10, episodeTitle: "Tập 10 · Giang Sơn Như Họa", views: 3180, dropOffPercent: 2.2 },
    ],
  },
  {
    movieId: "m-phuong-hoang-cung",
    movieSlug: "phuong-hoang-cung-bi-su",
    title: "Phượng Hoàng Cung Bí Sử",
    originalTitle: "凤凰宫秘史",
    genre: "Cung đấu · Quyền mưu",
    totalViews: 31890,
    activeVisitors: 13200,
    donateClicks: 845,
    donateCtr: 2.65,
    avgRetentionEpisode: 7.2,
    totalEpisodes: 10,
    retentionRate: 68.4,
    episodeDropOff: [
      { episodeNumber: 1, episodeTitle: "Tập 1 · Nhập Cung Tuyển Tú", views: 5200, dropOffPercent: 0 },
      { episodeNumber: 2, episodeTitle: "Tập 2 · Phượng Ấn Tranh Đoạt", views: 4790, dropOffPercent: 7.9 },
      { episodeNumber: 3, episodeTitle: "Tập 3 · Đêm Mưa Lãnh Cung", views: 4380, dropOffPercent: 8.6 },
      { episodeNumber: 4, episodeTitle: "Tập 4 · Hồng Nhan Họa Thủy", views: 3990, dropOffPercent: 8.9 },
      { episodeNumber: 5, episodeTitle: "Tập 5 · Độc Trà Ngự Hoa Viên", views: 3150, dropOffPercent: 21.1 },
      { episodeNumber: 6, episodeTitle: "Tập 6 · Kim Chi Ngọc Diệp", views: 2890, dropOffPercent: 8.3 },
      { episodeNumber: 7, episodeTitle: "Tập 7 · Hoàng Quyền Dậy Sóng", views: 2710, dropOffPercent: 6.2 },
      { episodeNumber: 8, episodeTitle: "Tập 8 · Phượng Minh Cửu Thiên", views: 2560, dropOffPercent: 5.5 },
    ],
  },
  {
    movieId: "m-cuu-u-huyen-canh",
    movieSlug: "cuu-u-huyen-canh",
    title: "Cửu U Huyền Cảnh Lục",
    originalTitle: "九幽玄境录",
    genre: "Huyền huyễn · Kỳ ảo",
    totalViews: 26410,
    activeVisitors: 10840,
    donateClicks: 680,
    donateCtr: 2.57,
    avgRetentionEpisode: 6.8,
    totalEpisodes: 8,
    retentionRate: 71.0,
    episodeDropOff: [
      { episodeNumber: 1, episodeTitle: "Tập 1 · Cửu U Khai Môn", views: 4650, dropOffPercent: 0 },
      { episodeNumber: 2, episodeTitle: "Tập 2 · Hồn Đăng Bất Diệt", views: 4280, dropOffPercent: 8.0 },
      { episodeNumber: 3, episodeTitle: "Tập 3 · Bỉ Ngạn Hoa Khai", views: 3890, dropOffPercent: 9.1 },
      { episodeNumber: 4, episodeTitle: "Tập 4 · Minh Hà Kiếm Khách", views: 3520, dropOffPercent: 9.5 },
      { episodeNumber: 5, episodeTitle: "Tập 5 · Huyễn Cảnh Mê Đồ", views: 3190, dropOffPercent: 9.4 },
      { episodeNumber: 6, episodeTitle: "Tập 6 · Thiên Ma Phá Ấn", views: 2940, dropOffPercent: 7.8 },
      { episodeNumber: 7, episodeTitle: "Tập 7 · Luân Hồi Chi Nhãn", views: 2790, dropOffPercent: 5.1 },
      { episodeNumber: 8, episodeTitle: "Tập 8 · Đại Đạo Quy Nhất", views: 2680, dropOffPercent: 3.9 },
    ],
  },
  {
    movieId: "m-thien-co-cam-thu",
    movieSlug: "thien-co-cam-thu",
    title: "Thiên Cổ Cầm Thư",
    originalTitle: "千古琴书",
    genre: "Tình cảm · Cổ phong",
    totalViews: 21540,
    activeVisitors: 9120,
    donateClicks: 520,
    donateCtr: 2.41,
    avgRetentionEpisode: 6.5,
    totalEpisodes: 8,
    retentionRate: 69.8,
    episodeDropOff: [
      { episodeNumber: 1, episodeTitle: "Tập 1 · Khúc Nhạc Trường An", views: 3890, dropOffPercent: 0 },
      { episodeNumber: 2, episodeTitle: "Tập 2 · Tri Âm Ngàn Dặm", views: 3540, dropOffPercent: 9.0 },
      { episodeNumber: 3, episodeTitle: "Tập 3 · Đoạn Huyền Cầm", views: 3210, dropOffPercent: 9.3 },
      { episodeNumber: 4, episodeTitle: "Tập 4 · Tuyết Phủ Cô Thành", views: 2890, dropOffPercent: 10.0 },
      { episodeNumber: 5, episodeTitle: "Tập 5 · Tương Tư Tuyệt Khúc", views: 2640, dropOffPercent: 8.7 },
      { episodeNumber: 6, episodeTitle: "Tập 6 · Thiên Nhai Minh Nguyệt", views: 2490, dropOffPercent: 5.7 },
    ],
  },
];

export const MOCK_TOP_KEYWORDS: SearchKeywordStat[] = [
  { keyword: "Tiên hiệp tu tiên AI", category: "Thể loại", count: 8420, trendPercent: 24.5 },
  { keyword: "Tiên Nghịch tập mới", category: "Từ khóa", count: 6930, trendPercent: 19.2 },
  { keyword: "Kiếm hiệp cổ trang 4K", category: "Thể loại", count: 5410, trendPercent: 14.8 },
  { keyword: "Vương Lâm tu ma", category: "Nhân vật", count: 4280, trendPercent: 31.0 },
  { keyword: "Cung đấu hoàng hậu", category: "Thể loại", count: 3890, trendPercent: 8.4 },
  { keyword: "Huyền huyễn đại chiến", category: "Từ khóa", count: 3120, trendPercent: 11.6 },
  { keyword: "Phim cổ trang hoàn thành", category: "Từ khóa", count: 2740, trendPercent: -3.2 },
];

export const MOCK_ANALYTICS_BY_RANGE: Record<TimeRangeKey, DashboardStats> = {
  today: {
    timeRange: "today",
    totalViews: {
      value: 24890,
      formattedValue: "24.890",
      changePercent: 18.4,
      subLabel: "Lượt mở tập phim trong 24h qua",
    },
    activeVisitors: {
      value: 9640,
      formattedValue: "9.640",
      changePercent: 12.7,
      subLabel: "Thiết bị / phiên ẩn danh đang xem",
    },
    donateClicks: {
      value: 712,
      formattedValue: "712",
      changePercent: 26.5,
      ctrPercent: 2.86,
      subLabel: "Tỷ lệ CTR: 2.86% trên tổng lượt xem",
    },
    retentionRate: {
      value: 76.4,
      formattedValue: "76.4%",
      changePercent: 4.2,
      avgStopEpisode: "Tập 9.2",
      subLabel: "Trung bình dừng ở Tập 9.2 / 12 tập",
    },
    trendSeries: [
      { date: "00:00", views: 2150, donateClicks: 64 },
      { date: "04:00", views: 1180, donateClicks: 29 },
      { date: "08:00", views: 2890, donateClicks: 78 },
      { date: "12:00", views: 4620, donateClicks: 134 },
      { date: "16:00", views: 5190, donateClicks: 149 },
      { date: "20:00", views: 8860, donateClicks: 258 },
    ],
    topMovies: MOCK_MOVIE_ANALYTICS.map((m) => ({
      ...m,
      totalViews: Math.round(m.totalViews * 0.16),
      donateClicks: Math.round(m.donateClicks * 0.16),
    })),
    topKeywords: MOCK_TOP_KEYWORDS.map((k) => ({
      ...k,
      count: Math.round(k.count * 0.18),
    })),
  },
  "7d": {
    timeRange: "7d",
    totalViews: {
      value: 167700,
      formattedValue: "167.700",
      changePercent: 15.8,
      subLabel: "Tổng lượt mở tập phim 7 ngày qua",
    },
    activeVisitors: {
      value: 68410,
      formattedValue: "68.410",
      changePercent: 11.3,
      subLabel: "Thiết bị / session ẩn danh duy nhất",
    },
    donateClicks: {
      value: 4560,
      formattedValue: "4.560",
      changePercent: 22.9,
      ctrPercent: 2.72,
      subLabel: "Tỷ lệ CTR: 2.72% mở Thưởng Linh Thạch",
    },
    retentionRate: {
      value: 74.8,
      formattedValue: "74.8%",
      changePercent: 3.6,
      avgStopEpisode: "Tập 8.8",
      subLabel: "Trung bình khán giả xem tới Tập 8.8",
    },
    trendSeries: [
      { date: "14/11", views: 19800, donateClicks: 510 },
      { date: "15/11", views: 22400, donateClicks: 590 },
      { date: "16/11", views: 25100, donateClicks: 685 },
      { date: "17/11", views: 23600, donateClicks: 640 },
      { date: "18/11", views: 24200, donateClicks: 665 },
      { date: "19/11", views: 25900, donateClicks: 725 },
      { date: "20/11", views: 26700, donateClicks: 745 },
    ],
    topMovies: MOCK_MOVIE_ANALYTICS,
    topKeywords: MOCK_TOP_KEYWORDS,
  },
  "30d": {
    timeRange: "30d",
    totalViews: {
      value: 642800,
      formattedValue: "642.800",
      changePercent: 28.4,
      subLabel: "Tổng lượt mở tập phim 30 ngày qua",
    },
    activeVisitors: {
      value: 249300,
      formattedValue: "249.300",
      changePercent: 19.6,
      subLabel: "Thiết bị / session ẩn danh trong tháng",
    },
    donateClicks: {
      value: 17890,
      formattedValue: "17.890",
      changePercent: 34.1,
      ctrPercent: 2.78,
      subLabel: "Tỷ lệ CTR: 2.78% mở Thưởng Linh Thạch",
    },
    retentionRate: {
      value: 73.2,
      formattedValue: "73.2%",
      changePercent: -1.4,
      avgStopEpisode: "Tập 8.4",
      subLabel: "Trung bình khán giả xem tới Tập 8.4",
    },
    trendSeries: [
      { date: "Tuần 1", views: 138400, donateClicks: 3690 },
      { date: "Tuần 2", views: 152900, donateClicks: 4180 },
      { date: "Tuần 3", views: 169200, donateClicks: 4740 },
      { date: "Tuần 4", views: 182300, donateClicks: 5280 },
    ],
    topMovies: MOCK_MOVIE_ANALYTICS.map((m) => ({
      ...m,
      totalViews: Math.round(m.totalViews * 3.8),
      donateClicks: Math.round(m.donateClicks * 3.9),
    })),
    topKeywords: MOCK_TOP_KEYWORDS.map((k) => ({
      ...k,
      count: Math.round(k.count * 3.7),
    })),
  },
};

export const MOCK_DASHBOARD_STATS: DashboardStats = MOCK_ANALYTICS_BY_RANGE["7d"];

/**
 * Danh sách link tập phim mẫu phục vụ kiểm thử ngay tính năng Quét Sức Khỏe Link Tự Động.
 * Bao gồm:
 * - Link YouTube thật đang hoạt động (trả về HTTP 200 OK từ YouTube oEmbed)
 * - Link YouTube bị xóa / khóa / không tồn tại (trả về HTTP 404/400/403 từ YouTube oEmbed)
 * - Link Facebook Video (đánh dấu Cần Kiểm Tra Thủ Công - Vàng)
 */
export const MOCK_LINK_CHECK_TARGETS: LinkCheckResult[] = [
  {
    id: "chk-1",
    movieId: "m-tien-nghich-ai",
    movieSlug: "tien-nghich-vinh-hang",
    movieTitle: "Tiên Nghịch: Vĩnh Hằng Kiếm Vực",
    episodeId: "ep-tn-1",
    episodeNumber: 1,
    episodeTitle: "Tập 1 · Phàm Nhân Nhập Đạo",
    serverLabel: "Server 1 (Chính · YT)",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    status: "idle",
    httpCode: null,
    statusMessage: "Chưa kiểm tra",
    checkedAt: null,
  },
  {
    id: "chk-2",
    movieId: "m-tien-nghich-ai",
    movieSlug: "tien-nghich-vinh-hang",
    movieTitle: "Tiên Nghịch: Vĩnh Hằng Kiếm Vực",
    episodeId: "ep-tn-2",
    episodeNumber: 2,
    episodeTitle: "Tập 2 · Linh Căn Thức Tỉnh",
    serverLabel: "Server 1 (Chính · YT)",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=YE7VzlLtp-4",
    status: "idle",
    httpCode: null,
    statusMessage: "Chưa kiểm tra",
    checkedAt: null,
  },
  {
    id: "chk-3",
    movieId: "m-tien-nghich-ai",
    movieSlug: "tien-nghich-vinh-hang",
    movieTitle: "Tiên Nghịch: Vĩnh Hằng Kiếm Vực",
    episodeId: "ep-tn-6",
    episodeNumber: 6,
    episodeTitle: "Tập 6 · Vực Ngoại Ma Ảnh",
    serverLabel: "Server 1 (Chính · YT)",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=00000000000",
    status: "idle",
    httpCode: null,
    statusMessage: "Chưa kiểm tra",
    checkedAt: null,
  },
  {
    id: "chk-4",
    movieId: "m-van-kiem-lam-ngo",
    movieSlug: "van-kiem-lam-ngo",
    movieTitle: "Vấn Kiếm Lâm Ngô",
    episodeId: "ep-vk-1",
    episodeNumber: 1,
    episodeTitle: "Tập 1 · Tuyết Lạc Lâm Sơn",
    serverLabel: "Server 1 (Chính · YT)",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=eRsGyueVLvQ",
    status: "idle",
    httpCode: null,
    statusMessage: "Chưa kiểm tra",
    checkedAt: null,
  },
  {
    id: "chk-5",
    movieId: "m-van-kiem-lam-ngo",
    movieSlug: "van-kiem-lam-ngo",
    movieTitle: "Vấn Kiếm Lâm Ngô",
    episodeId: "ep-vk-4",
    episodeNumber: 4,
    episodeTitle: "Tập 4 · Phong Vân Kiếm Các",
    serverLabel: "Server 1 (Chính · YT)",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=broken_ai_cotrang_404",
    status: "idle",
    httpCode: null,
    statusMessage: "Chưa kiểm tra",
    checkedAt: null,
  },
  {
    id: "chk-6",
    movieId: "m-van-kiem-lam-ngo",
    movieSlug: "van-kiem-lam-ngo",
    movieTitle: "Vấn Kiếm Lâm Ngô",
    episodeId: "ep-vk-5",
    episodeNumber: 5,
    episodeTitle: "Tập 5 · Tuyệt Đỉnh Giao Phong",
    serverLabel: "Server 2 (Dự phòng · FB)",
    provider: "facebook",
    sourceUrl: "https://www.facebook.com/facebook/videos/10153231379946729/",
    status: "idle",
    httpCode: null,
    statusMessage: "Chưa kiểm tra",
    checkedAt: null,
  },
  {
    id: "chk-7",
    movieId: "m-phuong-hoang-cung",
    movieSlug: "phuong-hoang-cung-bi-su",
    movieTitle: "Phượng Hoàng Cung Bí Sử",
    episodeId: "ep-ph-1",
    episodeNumber: 1,
    episodeTitle: "Tập 1 · Nhập Cung Tuyển Tú",
    serverLabel: "Server 1 (Chính · YT)",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=mN0zPOpADL4",
    status: "idle",
    httpCode: null,
    statusMessage: "Chưa kiểm tra",
    checkedAt: null,
  },
  {
    id: "chk-8",
    movieId: "m-phuong-hoang-cung",
    movieSlug: "phuong-hoang-cung-bi-su",
    movieTitle: "Phượng Hoàng Cung Bí Sử",
    episodeId: "ep-ph-5",
    episodeNumber: 5,
    episodeTitle: "Tập 5 · Độc Trà Ngự Hoa Viên",
    serverLabel: "Server 1 (Chính · YT)",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=ZZZZZZZZZZZ",
    status: "idle",
    httpCode: null,
    statusMessage: "Chưa kiểm tra",
    checkedAt: null,
  },
  {
    id: "chk-9",
    movieId: "m-cuu-u-huyen-canh",
    movieSlug: "cuu-u-huyen-canh",
    movieTitle: "Cửu U Huyền Cảnh Lục",
    episodeId: "ep-cu-3",
    episodeNumber: 3,
    episodeTitle: "Tập 3 · Bỉ Ngạn Hoa Khai",
    serverLabel: "Server 2 (Dự phòng · FB)",
    provider: "facebook",
    sourceUrl: "https://fb.watch/co-trang-cuu-u-tap-3/",
    status: "idle",
    httpCode: null,
    statusMessage: "Chưa kiểm tra",
    checkedAt: null,
  },
];

/**
 * Chuẩn hóa URL YouTube sang dạng watch?v=<ID> để gọi YouTube oEmbed ổn định
 * ngay cả khi Admin nhập link dạng /embed/<ID> hoặc youtu.be/<ID>.
 */
export function normalizeYouTubeUrlForOembed(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
    if (host.endsWith("youtube.com") || host === "youtube-nocookie.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if ((parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") && parts[1]) {
        return `https://www.youtube.com/watch?v=${parts[1]}`;
      }
    }
  } catch {
    // Giữ nguyên rawUrl nếu không parse được URL
  }
  return trimmed;
}

/**
 * Kiểm tra sức khỏe 1 link video:
 * - Nếu là Facebook: trả về trạng thái `manual_check` (Cần Kiểm Tra Thủ Công - Vàng).
 * - Nếu là YouTube: gọi API công khai `https://www.youtube.com/oembed?url=<YOUTUBE_URL>&format=json`.
 *   + HTTP 200 OK -> `active` (Hoạt động - Xanh lá)
 *   + HTTP 400 / 401 / 403 / 404 hoặc lỗi mạng -> `broken` (Link Lỗi / Bị Khóa - Đỏ)
 */
export async function checkSingleLinkHealth(
  item: LinkCheckResult,
  fetchImpl: typeof fetch = fetch,
): Promise<LinkCheckResult> {
  const now = new Date().toISOString();
  const isFacebook =
    item.provider === "facebook" ||
    /facebook\.com|fb\.watch/i.test(item.sourceUrl);

  if (isFacebook) {
    return {
      ...item,
      provider: "facebook",
      status: "manual_check",
      httpCode: null,
      statusMessage: "Cần Kiểm Tra Thủ Công (Facebook không mở oEmbed công khai)",
      checkedAt: now,
    };
  }

  const normalizedYtUrl = normalizeYouTubeUrlForOembed(item.sourceUrl);
  const oembedEndpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedYtUrl)}&format=json`;

  try {
    const response = await fetchImpl(oembedEndpoint, {
      method: "GET",
    });

    if (response.ok && response.status === 200) {
      return {
        ...item,
        status: "active",
        httpCode: 200,
        statusMessage: "Hoạt động (200 OK)",
        checkedAt: now,
      };
    }

    const code = response.status;
    let reason = `HTTP ${code} — Link Lỗi / Bị Khóa`;
    if (code === 401 || code === 403) {
      reason = `HTTP ${code} — Video riêng tư hoặc chặn nhúng`;
    } else if (code === 404 || code === 400) {
      reason = `HTTP ${code} — Video đã bị xóa hoặc không tồn tại`;
    }

    return {
      ...item,
      status: "broken",
      httpCode: code,
      statusMessage: reason,
      checkedAt: now,
    };
  } catch {
    return {
      ...item,
      status: "broken",
      httpCode: 0,
      statusMessage: "Lỗi mạng / Không thể kết nối oEmbed",
      checkedAt: now,
    };
  }
}

/**
 * Quét danh sách link theo từng batch (mặc định 5 link/lần để tránh nghẽn mạng)
 * và cập nhật tiến trình theo thời gian thực qua callback `onBatchProgress`.
 */
export async function runBatchLinkHealthCheck(
  items: LinkCheckResult[],
  options?: {
    batchSize?: number;
    fetchImpl?: typeof fetch;
    onProgress?: (params: {
      completedCount: number;
      totalCount: number;
      currentBatchResults: LinkCheckResult[];
      allResults: LinkCheckResult[];
    }) => void;
  },
): Promise<LinkCheckResult[]> {
  const batchSize = Math.max(1, options?.batchSize ?? 5);
  const fetchImpl = options?.fetchImpl ?? fetch;
  const totalCount = items.length;
  const results: LinkCheckResult[] = [...items];
  let completedCount = 0;

  for (let start = 0; start < totalCount; start += batchSize) {
    const slice = items.slice(start, start + batchSize);
    const batchChecked = await Promise.all(
      slice.map((item) => checkSingleLinkHealth(item, fetchImpl)),
    );

    for (let offset = 0; offset < batchChecked.length; offset += 1) {
      results[start + offset] = batchChecked[offset]!;
    }
    completedCount = Math.min(totalCount, start + batchChecked.length);

    options?.onProgress?.({
      completedCount,
      totalCount,
      currentBatchResults: batchChecked,
      allResults: [...results],
    });
  }

  return results;
}
