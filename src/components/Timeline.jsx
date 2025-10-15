import React, { useMemo, useRef, useState, useEffect } from "react";

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDay(d) {
  return d.getDate();
}

function formatMonth(d) {
  return d.toLocaleString("ru-RU", { month: "long" });
}

export default function Timeline({ events, onSelectBlock }) {
  const today = startOfDay(new Date());
  const [offsetMonths, setOffsetMonths] = useState(0);
  const gridRef = useRef(null);
  const headerRef = useRef(null);
  const namesRef = useRef(null);

  const [fromDate, toDate, days] = useMemo(() => {
    const from = new Date(today);
    from.setMonth(from.getMonth() - 3 + offsetMonths);
    const to = new Date(today);
    to.setMonth(to.getMonth() + 3 + offsetMonths);
    const dayCount = Math.ceil((to - from) / (24 * 3600 * 1000));
    const arr = Array.from({ length: dayCount }, (_, i) => addDays(from, i));
    return [startOfDay(from), startOfDay(to), arr];
  }, [offsetMonths]);

  const months = useMemo(() => {
    const result = [];
    const first = new Date(fromDate);
    first.setDate(1);
    first.setHours(0, 0, 0, 0);
    let cursor = first;
    while (cursor < toDate) {
      const start = new Date(cursor);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      result.push({
        label: `${formatMonth(start)}`,
        start: startOfDay(start),
        end: startOfDay(end),
      });
      cursor = end;
    }
    return result;
  }, [fromDate, toDate]);

  const dayWidth = 24;
  const rowHeight = 48;
  const sidebarWidth = 260;

  useEffect(() => {
    const idx = Math.floor((today - fromDate) / (24 * 3600 * 1000));
    const x = Math.max(0, idx * dayWidth - 200);
    if (gridRef.current) gridRef.current.scrollLeft = x;
    if (headerRef.current) headerRef.current.scrollLeft = x;
  }, [fromDate]);

  function blockStyle(block) {
    const s = startOfDay(new Date(block.start_date || block.startDate));
    const e = startOfDay(new Date(block.end_date || block.endDate));
    const left = Math.max(0, Math.floor((s - fromDate) / (24 * 3600 * 1000)) * dayWidth);
    const right = Math.floor((e - fromDate) / (24 * 3600 * 1000)) * dayWidth;
    const width = Math.max(dayWidth, right - left);
    return { left, width };
  }

  function onGridScroll(e) {
    if (headerRef.current) headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    if (namesRef.current) namesRef.current.scrollTop = e.currentTarget.scrollTop;
  }

  function onHeaderScroll(e) {
    if (gridRef.current) gridRef.current.scrollLeft = e.currentTarget.scrollLeft;
  }

  function onNamesScroll(e) {
    if (gridRef.current) gridRef.current.scrollTop = e.currentTarget.scrollTop;
  }

  return (
    <div className="tl-root">
      <div className="tl-header">
        <div className="tl-title">Наименование</div>
        <div className="tl-calendar">
          <div
            className="tl-cal-scroller"
            ref={headerRef}
            onScroll={onHeaderScroll}
            aria-hidden="true"
          >
            <div className="tl-months" style={{ width: days.length * dayWidth }}>
              {months.map((m, i) => {
                const dayCount = days.length;
                const startIdx = Math.floor((m.start - fromDate) / (24 * 3600 * 1000));
                const endIdx = Math.floor((m.end - fromDate) / (24 * 3600 * 1000));
                const visibleStart = Math.max(0, startIdx);
                const visibleEnd = Math.min(dayCount, endIdx);
                const width = Math.max(0, (visibleEnd - visibleStart) * dayWidth);
              return (
                <div key={i} className="tl-month" style={{ width }}>
                  {m.label}
                </div>
              );
            })}
            </div>
            <div className="tl-days" style={{ width: days.length * dayWidth }}>
              {days.map((d, i) => (
                <div
                  key={i}
                  className={
                    "tl-day" +
                    (d.getTime() === today.getTime() ? " tl-day-today" : "")
                  }
                  style={{ width: dayWidth }}
                >
                  {formatDay(d)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="tl-body">
        <div
          className="tl-sidebar"
          style={{ width: sidebarWidth }}
          ref={namesRef}
          onScroll={onNamesScroll}
        >
          {events.map((ev) => (
            <div key={ev.id} className="tl-event-name" style={{ height: rowHeight }}>
              {ev.name}
            </div>
          ))}
        </div>
        <div className="tl-scroller" ref={gridRef} onScroll={onGridScroll}>
          <div
            className="tl-grid"
            style={{ width: days.length * dayWidth, minWidth: "100%" }}
          >
            {events.map((ev) => (
              <div key={ev.id} className="tl-row" style={{ height: rowHeight }}>
                {days.map((_, i) => (
                  <div key={i} className="tl-cell" style={{ width: dayWidth }} />
                ))}
                {Array.isArray(ev.event_blocks) &&
                  ev.event_blocks.map((b) => {
                    const { left, width } = blockStyle(b);
                    return (
                      <button
                        key={b.id}
                        className="tl-block"
                        style={{ left, width }}
                        onClick={() => onSelectBlock(b)}
                        title={b.name}
                      >
                        {b.name}
                      </button>
                    );
                  })}
              </div>
            ))}
            <div
              className="tl-today-line"
              style={{ left: Math.max(0, Math.floor((today - fromDate) / (24 * 3600 * 1000)) * dayWidth) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


