/**
 * The timeline calendar: the board grouped by day under one sticky date that
 * changes as you scroll into the next day.
 *
 * Each day has its own header in the flow. A single sticky header sits over
 * the top of the list and always names the day you are reading — it is pulled
 * up over the first day's own header (`-mt-12` on the list, the header's own
 * height) so at rest there is one date on screen, not two. As a day crosses a
 * line just under the sticky header, that day becomes current and its date
 * slides in from the left.
 *
 * That slide is the only movement here, and it is what tells you the date
 * changed under a list that is otherwise scrolling smoothly — a date that
 * simply swapped its text would go unnoticed.
 *
 * Needs the scroll container as `root`: in this shell the window never
 * scrolls, a panel does, and an observer on the viewport would never fire.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE_PANEL } from "@/lib/motion";

export interface CalendarDay {
  id: string;
  /** The bright part, e.g. "October 13". */
  date: string;
  /** The quiet part after the slash, e.g. "Today" or "Monday". */
  day: string;
  /** Right-aligned summary of the day — totals, a face stack. */
  meta?: ReactNode;
  children: ReactNode;
}

/** Header height; the sticky header and each day's header share it. */
const HEADER = "h-12";
/** The same height in pixels, for the scroll maths. */
const HEADER_PX = 48;

export function TimelineCalendar({
  days,
  root,
  className,
}: {
  days: CalendarDay[];
  root: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const [currentId, setCurrentId] = useState(days[0]?.id);
  const current = days.find((d) => d.id === currentId) ?? days[0];
  const list = useRef<HTMLDivElement>(null);

  /**
   * Which day the reader is in: the last one whose own header has reached the
   * sticky header's line.
   *
   * Measured from scroll position rather than observed per day. The obvious
   * `IntersectionObserver` for this is a 1px band at the top of the scroller
   * — `rootMargin: "-1px 0px -100% 0px"` — and that margin is degenerate: the
   * bottom inset takes the root's full height, so the band ends up 1px ABOVE
   * where it starts and nothing can ever intersect it. The date sat on the
   * first day forever.
   */
  const sync = useCallback(() => {
    const scroller = root.current;
    const el = list.current;
    if (!scroller || !el) return;
    const line = scroller.getBoundingClientRect().top + HEADER_PX;
    let found: string | undefined = days[0]?.id;
    for (const section of el.querySelectorAll<HTMLElement>("[data-day]")) {
      if (section.getBoundingClientRect().top > line) break;
      found = section.dataset.day ?? found;
    }
    if (found) setCurrentId(found);
  }, [root, days]);

  useEffect(() => {
    const scroller = root.current;
    if (!scroller) return;
    // One rAF per scroll burst: `getBoundingClientRect` in a scroll handler is
    // a layout read, and the list can hold five hundred rows.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    };
    sync();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [root, sync]);

  if (!current) return null;

  return (
    <div data-slot="timeline-calendar" className={className}>
      {/* The backing bleeds past each side: rows widen their hover background
          past the column's edges, and without the bleed that background shows
          either side of the date as a row scrolls under it. */}
      <header
        className={cn(
          HEADER,
          "sticky top-0 z-panel flex items-end border-b border-border pb-2.5",
          "before:absolute before:-inset-x-4 before:inset-y-0 before:-z-10 before:bg-background",
        )}
      >
        {/* Keyed, with no `AnimatePresence`: the key change unmounts the old
            date and mounts the new one, which plays `initial → animate`.
            Presence would keep the OUTGOING date alive for its exit, and a
            fast scroll changes the day faster than an exit completes — so
            they stacked, and "Today" sat in the header next to the day you
            had actually scrolled to and never left. */}
        <motion.div
          key={current.id}
          initial={{ x: -6, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.22, ease: EASE_PANEL }}
          className="flex flex-1 items-end justify-between gap-3"
        >
          <span className="text-lg tracking-tight">
            <span className="font-medium text-foreground">{current.date}</span>
            <span className="text-muted-foreground"> / {current.day}</span>
          </span>
          {current.meta}
        </motion.div>
      </header>

      {/* `isolate`: rows raise their own hover background, and this keeps
          those layers inside the list, under the sticky date. */}
      <div ref={list} className="isolate -mt-12">
        {days.map((day) => (
          <section
            key={day.id}
            data-day={day.id}
            aria-label={`${day.date}, ${day.day}`}
            className="pb-10"
          >
            <h2
              className={cn(
                HEADER,
                "flex items-end justify-between gap-3 border-b border-border pb-2.5",
              )}
            >
              <span className="text-lg tracking-tight">
                <span className="font-medium text-foreground">{day.date}</span>
                <span className="text-muted-foreground">&nbsp;/ {day.day}</span>
              </span>
              {day.meta}
            </h2>
            {day.children}
          </section>
        ))}
        {/* Room for the last day to reach the top and become current; without
            it the final days could never be the sticky date. */}
        <div aria-hidden className="h-[80vh]" />
      </div>
    </div>
  );
}
