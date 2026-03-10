import type { SolutionEntry } from "@/data/mockData";
import SolutionCard from "./SolutionCard";
import { format, isSameDay } from "date-fns";

interface Props {
  entries: SolutionEntry[];
  onEdit?: (entry: SolutionEntry) => void;
  onDelete?: (id: string) => void;
}

export default function Timeline({ entries, onEdit, onDelete }: Props) {
  const sorted = [...entries].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  // Group entries by date for date separator badges
  const groupedByDate: { date: Date; entries: { entry: SolutionEntry; globalIndex: number }[] }[] = [];
  sorted.forEach((entry, globalIndex) => {
    const last = groupedByDate[groupedByDate.length - 1];
    if (last && isSameDay(last.date, entry.timestamp)) {
      last.entries.push({ entry, globalIndex });
    } else {
      groupedByDate.push({ date: entry.timestamp, entries: [{ entry, globalIndex }] });
    }
  });

  return (
    <div className="relative py-8 px-2">
      {/* Glowing vertical line — mobile: left-aligned, desktop: centered */}
      <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px sm:-translate-x-1/2 timeline-glow-line" />

      {/* START marker */}
      <div className="relative flex flex-col items-center mb-12 z-10">
        <div className="timeline-start-marker">
          <span className="timeline-start-pulse" />
          <div className="h-4 w-4 rounded-full bg-primary z-10 relative" />
        </div>
        <div className="mt-3 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary tracking-wide text-center">
          🚀 Project Started · {format(new Date("2026-02-22"), "dd MMM yyyy")}
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-0">
        {groupedByDate.map(({ date, entries: groupEntries }) => (
          <div key={date.toISOString()} className="mb-2">
            {/* Date separator badge */}
            <div className="relative flex justify-center z-10 mb-10">
              <div className="px-5 py-1.5 rounded-full glass-card border border-timeline-dot/30 text-xs font-semibold text-primary/80 tracking-widest uppercase shadow-sm text-center">
                {format(date, "EEEE, dd MMM yyyy")}
              </div>
            </div>

            {/* Entries for this day */}
            <div className="space-y-14">
              {groupEntries.map(({ entry, globalIndex }) => {
                const side = globalIndex % 2 === 0 ? "left" : "right";
                return (
                  <div key={entry.id} className="relative flex items-start">
                    {/* Pulsing dot on line — mobile: left edge (~16px), desktop: center */}
                    <div className="absolute left-4 sm:left-1/2 top-5 -translate-x-1/2 z-20">
                      <div className={`timeline-entry-dot ${entry.status === "resolved" ? "dot-resolved" : "dot-progress"}`}>
                        <span className={`timeline-dot-ring ${entry.status === "resolved" ? "ring-resolved" : "ring-progress"}`} />
                      </div>
                    </div>

                    {/* Time label */}
                    {/* Mobile: always shown right of the dot */}
                    <div className="absolute top-3.5 left-10 text-[11px] font-semibold tracking-wide text-muted-foreground/70 sm:hidden">
                      {format(entry.timestamp, "h:mm a")}
                    </div>
                    {/* Desktop: alternating sides */}
                    <div className={`absolute top-3.5 text-[11px] font-semibold tracking-wide text-muted-foreground/70 hidden sm:block ${side === "left"
                        ? "left-1/2 ml-6"
                        : "right-1/2 mr-6 text-right"
                      }`}>
                      {format(entry.timestamp, "h:mm a")}
                    </div>

                    {/* Card container */}
                    {/* Mobile: always full-width, offset right from the left dot */}
                    {/* Desktop: alternating sides */}
                    <div className={`relative flex w-full pl-12 sm:pl-0 ${side === "left" ? "sm:pr-[calc(50%+2.5rem)]" : "sm:pl-[calc(50%+2.5rem)]"
                      }`}>
                      {/* Mobile connector arm */}
                      <div className="sm:hidden absolute top-5 left-4 h-px w-8 bg-gradient-to-r from-timeline-dot/60 to-transparent" />
                      {/* Desktop connector arm */}
                      <div className={`hidden sm:block absolute top-5 h-px w-8 bg-gradient-to-r ${side === "left"
                          ? "right-[calc(50%+0.5rem)] from-transparent to-timeline-dot/60"
                          : "left-[calc(50%+0.5rem)] from-timeline-dot/60 to-transparent"
                        }`} />

                      <SolutionCard
                        entry={entry}
                        side={side}
                        index={globalIndex}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* END marker */}
      <div className="relative flex flex-col items-center mt-16 z-10">
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 bg-card" />
        <div className="mt-3 px-4 py-1.5 rounded-full bg-muted/60 border border-border text-xs font-semibold text-muted-foreground tracking-wide">
          🏁 Sprint Ends · 04 Mar 2026
        </div>
      </div>
    </div>
  );
}
