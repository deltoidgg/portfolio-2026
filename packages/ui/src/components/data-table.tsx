import type { ReactNode } from "react";
import { cn } from "../cn";

export interface DataTableColumn<Row> {
  id: string;
  header: string;
  align?: "left" | "right";
  render: (row: Row) => ReactNode;
}

interface DataTableProps<Row> {
  caption: string;
  /** Visually hide the caption while keeping it for assistive technology. */
  captionHidden?: boolean;
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  getRowKey: (row: Row) => string;
  /** Accessible name for the keyboard-scrollable region; defaults to the caption. */
  scrollLabel?: string;
  className?: string;
}

/** Accessible data table: captioned, scoped headers, numeric alignment. */
export function DataTable<Row>({
  caption,
  captionHidden = false,
  columns,
  rows,
  getRowKey,
  scrollLabel,
  className,
}: DataTableProps<Row>) {
  return (
    <div
      role="region"
      aria-label={scrollLabel ?? caption}
      tabIndex={0}
      className={cn(
        "overflow-x-auto rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      <table className="w-full text-sm border-collapse">
        <caption
          className={cn("text-left text-xs text-ink-subtle mb-3", captionHidden && "sr-only")}
        >
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-edge-strong">
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={cn(
                  "py-2 pr-4 font-medium text-ink text-xs uppercase tracking-wide",
                  column.align === "right" ? "text-right" : "text-left",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="border-b border-edge">
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn(
                    "py-2 pr-4 text-ink-muted",
                    column.align === "right" ? "text-right tabular-nums" : "text-left",
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
