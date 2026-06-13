export interface StatItem {
  value: string;
  label: string;
}

/** A row of headline numbers, the blog equivalent of the paper's stats strip. */
export function StatRow({ stats }: { stats: StatItem[] }) {
  return (
    <div className="my-10 grid grid-cols-1 gap-6 rounded-lg border border-edge px-6 py-5 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1">
          <span className="text-3xl font-semibold tabular-nums text-ink">{stat.value}</span>
          <span className="text-xs leading-snug text-ink-subtle">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
