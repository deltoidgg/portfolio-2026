export interface StatItem {
  value: string;
  label: string;
}

/** A row of headline numbers, the blog equivalent of the paper's stats strip. */
export function StatRow({ stats }: { stats: StatItem[] }) {
  return (
    <dl className="my-12 grid grid-cols-1 gap-x-8 gap-y-6 border-y border-edge py-6 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col-reverse gap-1.5">
          <dt className="text-sm leading-snug text-ink-subtle">{stat.label}</dt>
          <dd className="font-display text-[2.75rem] leading-none tabular-nums text-ink">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
