export default function AdminPanelLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Đang tải dữ liệu quản trị">
      <div className="space-y-2 border-b border-ink-800 pb-4">
        <div className="h-7 w-56 rounded-md bg-ink-800/80" />
        <div className="h-4 w-80 max-w-full rounded bg-ink-850/90" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel h-28 border-ink-800 bg-ink-900/60 p-4">
            <div className="h-3.5 w-24 rounded bg-ink-800" />
            <div className="mt-4 h-7 w-16 rounded bg-gold-500/15" />
          </div>
        ))}
      </div>

      <div className="panel h-64 border-ink-800 bg-ink-900/50 p-5">
        <div className="h-5 w-44 rounded bg-ink-800" />
        <div className="mt-4 space-y-3">
          <div className="h-10 w-full rounded bg-ink-850" />
          <div className="h-10 w-full rounded bg-ink-850" />
          <div className="h-10 w-5/6 rounded bg-ink-850" />
        </div>
      </div>
    </div>
  );
}
