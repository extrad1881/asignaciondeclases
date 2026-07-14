import { WEEKDAYS } from "@/lib/constants";

type TimeRow = {
  key: string;
  startsAt: string;
  endsAt: string;
  mod?: number;
  kind: "class" | "break";
};

function formatTime(value: string) {
  return value.slice(0, 5);
}

function buildTimeRows<TBlock>(
  blocks: TBlock[],
  getStartsAt: (block: TBlock) => string,
  getEndsAt: (block: TBlock) => string,
  getModule?: (block: TBlock) => number | undefined
): TimeRow[] {
  const classRows = Array.from(
    new Map(
      blocks
        .map((block) => {
          const startsAt = formatTime(getStartsAt(block));
          const endsAt = formatTime(getEndsAt(block));
          const mod = getModule?.(block) ?? 0;
          return {
            key: `${startsAt}-${endsAt}-M${mod}`,
            startsAt,
            endsAt,
            mod,
            kind: "class" as const
          };
        })
        .map((row) => [row.key, row])
    ).values()
  ).sort((a, b) => a.startsAt.localeCompare(b.startsAt) || (a.mod ?? 0) - (b.mod ?? 0));

  return classRows.flatMap((row, index) => {
    const previous = classRows[index - 1];
    if (!previous || previous.endsAt >= row.startsAt) return [row];
    return [
      {
        key: `break-${previous.endsAt}-${row.startsAt}`,
        startsAt: previous.endsAt,
        endsAt: row.startsAt,
        kind: "break" as const
      },
      row
    ];
  });
}

export type ScheduleTableProps<TBlock, TAssignment> = {
  blocks: TBlock[];
  assignments?: TAssignment[];
  getBlockKey: (block: TBlock) => string;
  getBlockDay: (block: TBlock) => number;
  getBlockStartsAt: (block: TBlock) => string;
  getBlockEndsAt: (block: TBlock) => string;
  getBlockModule?: (block: TBlock) => number | undefined;
  getAssignmentBlockKey: (assignment: TAssignment) => string;
  dayLabel?: "full" | "short";
  emptyMessage?: string;
  renderCell: (props: { block: TBlock; assignments: TAssignment[] }) => React.ReactNode;
  renderEmptyCell?: () => React.ReactNode;
};

export function ScheduleTable<TBlock, TAssignment>({
  blocks,
  assignments = [],
  getBlockKey,
  getBlockDay,
  getBlockStartsAt,
  getBlockEndsAt,
  getBlockModule,
  getAssignmentBlockKey,
  dayLabel = "short",
  emptyMessage = "No hay bloques disponibles.",
  renderCell,
  renderEmptyCell
}: ScheduleTableProps<TBlock, TAssignment>) {
  const days = WEEKDAYS.filter((day) => blocks.some((block) => getBlockDay(block) === day.value));
  const timeRows = buildTimeRows(blocks, getBlockStartsAt, getBlockEndsAt, getBlockModule);

  if (blocks.length === 0) {
    return <p className="p-4 text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <table className="w-full min-w-[720px] border-collapse text-sm">
      <thead>
        <tr className="bg-panel text-left text-xs uppercase text-muted">
          <th className="w-32 snap-start px-3 py-3 font-semibold" scope="col">
            Hora
          </th>
          {days.map((day) => (
            <th className="snap-start px-3 py-3 font-semibold" key={day.value} scope="col">
              {dayLabel === "full" ? day.label : day.short}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {timeRows.map((time) => (
          <tr className="border-t border-line" key={time.key}>
            <th className="snap-start bg-panel px-3 py-3 text-left text-xs font-semibold text-muted" scope="row">
              {time.kind === "break" ? "RECESO" : `${time.startsAt} - ${time.endsAt}`}
              {time.mod && time.mod > 0 ? (
                <span className="ml-1 text-brand">M{time.mod}</span>
              ) : null}
            </th>
            {time.kind === "break" ? (
              <td
                className="bg-amber-50 px-3 py-3 text-center text-xs font-semibold uppercase text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                colSpan={days.length}
              >
                Receso {time.startsAt} - {time.endsAt}
              </td>
            ) : (
              days.map((day) => {
                const block = blocks.find(
                  (item) =>
                    getBlockDay(item) === day.value &&
                    formatTime(getBlockStartsAt(item)) === time.startsAt &&
                    formatTime(getBlockEndsAt(item)) === time.endsAt &&
                    (getBlockModule?.(item) ?? 0) === (time.mod ?? 0)
                );

                if (!block) {
                  return (
                    <td className="h-24 snap-start border-l border-line p-2 align-top" key={day.value}>
                      {renderEmptyCell ? renderEmptyCell() : <span className="text-xs text-muted-foreground">No aplica</span>}
                    </td>
                  );
                }

                const blockKey = getBlockKey(block);
                const blockAssignments = assignments.filter((assignment) => getAssignmentBlockKey(assignment) === blockKey);

                return (
                  <td className="h-24 snap-start border-l border-line p-2 align-top" key={day.value}>
                    {renderCell({ block, assignments: blockAssignments })}
                  </td>
                );
              })
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
