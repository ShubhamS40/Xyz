'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { addDays, formatDateYmd, monthStart, pad2, sameDay } from './dateUtils';

function buildCalendarDays(monthDate) {
  const start = monthStart(monthDate);
  const startWeekday = start.getDay(); // 0 Sun
  const gridStart = addDays(start, -startWeekday);
  const days = [];
  for (let i = 0; i < 42; i++) {
    days.push(addDays(gridStart, i));
  }
  return days;
}

function MonthGrid({
  monthDate,
  rangeStart,
  rangeEnd,
  onPick,
}) {
  const days = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const month = monthDate.getMonth();

  const isInRange = (d) => {
    if (!rangeStart || !rangeEnd) return false;
    const t = d.getTime();
    return t >= rangeStart.getTime() && t <= rangeEnd.getTime();
  };

  return (
    <div className="w-[320px]">
      <div className="text-center font-semibold text-black mb-3">
        {monthDate.getFullYear()} - {monthDate.getMonth() + 1}
      </div>
      <div className="grid grid-cols-7 text-xs text-gray-500 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d) => {
          const isCurrentMonth = d.getMonth() === month;
          const isStart = rangeStart && sameDay(d, rangeStart);
          const isEnd = rangeEnd && sameDay(d, rangeEnd);
          const inRange = isInRange(d);

          let cls =
            'h-9 w-9 mx-auto rounded-full flex items-center justify-center text-sm cursor-pointer';

          if (!isCurrentMonth) cls += ' text-gray-300';
          else cls += ' text-black hover:bg-gray-100';

          if (inRange) cls += ' bg-blue-50';
          if (isStart || isEnd) cls += ' bg-blue-600 text-white hover:bg-blue-600';

          return (
            <button
              key={d.toISOString()}
              type="button"
              className={cls}
              onClick={() => onPick(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePickerModal({
  open,
  onClose,
  initialStart,
  initialEnd,
  onConfirm,
}) {
  const [cursorMonth, setCursorMonth] = useState(() => new Date());
  const [start, setStart] = useState(initialStart ? new Date(initialStart) : null);
  const [end, setEnd] = useState(initialEnd ? new Date(initialEnd) : null);
  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState('23:59:59');

  const monthA = cursorMonth;
  const monthB = new Date(cursorMonth.getFullYear(), cursorMonth.getMonth() + 1, 1);

  const pickDay = (d) => {
    if (!start || (start && end)) {
      setStart(d);
      setEnd(null);
      return;
    }
    // only start set
    if (d.getTime() < start.getTime()) {
      setEnd(start);
      setStart(d);
    } else {
      setEnd(d);
    }
  };

  const headerValue = useMemo(() => {
    const s = start ? formatDateYmd(start) : '—';
    const e = end ? formatDateYmd(end) : '—';
    return `${s}  -  ${e}`;
  }, [start, end]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[780px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="text-sm text-black font-medium">{headerValue}</div>
          <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            className="p-2 rounded hover:bg-gray-100"
            onClick={() => setCursorMonth(new Date(cursorMonth.getFullYear(), cursorMonth.getMonth() - 1, 1))}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-xs text-gray-500">Select start and end dates</div>
          <button
            type="button"
            className="p-2 rounded hover:bg-gray-100"
            onClick={() => setCursorMonth(new Date(cursorMonth.getFullYear(), cursorMonth.getMonth() + 1, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="flex gap-6 justify-center">
            <MonthGrid monthDate={monthA} rangeStart={start} rangeEnd={end} onPick={pickDay} />
            <MonthGrid monthDate={monthB} rangeStart={start} rangeEnd={end} onPick={pickDay} />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <div className="flex items-center gap-2 border rounded px-2 py-1">
                <input
                  className="w-[72px] outline-none text-black text-xs"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="00:00:00"
                />
                <span className="text-gray-400">-</span>
                <input
                  className="w-[72px] outline-none text-black text-xs"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="23:59:59"
                />
              </div>
              <div className="text-gray-400">Format: HH:mm:ss</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-4 py-2 text-sm rounded border hover:bg-gray-50"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
                disabled={!start || !end}
                onClick={() => {
                  if (!start || !end) return;
                  onConfirm({
                    startDate: `${formatDateYmd(start)} ${startTime}`,
                    endDate: `${formatDateYmd(end)} ${endTime}`,
                  });
                }}
              >
                Confirm
              </button>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            Tip: Pick dates, then Confirm. Start/end time defaults to 00:00:00 - 23:59:59.
          </div>
        </div>
      </div>
    </div>
  );
}

