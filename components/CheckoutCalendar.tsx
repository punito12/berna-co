"use client";

import { useMemo, useState } from "react";

// Month-grid date picker. Only enabled weekdays (and not past dates) are
// selectable; everything else is greyed out. Dates are handled as local
// "yyyy-mm-dd" strings to avoid timezone surprises.

const WEEKDAY_LABELS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toIso(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

type Props = {
  enabledWeekdays: number[];
  selected: string | null; // yyyy-mm-dd
  onSelect: (iso: string) => void;
};

export default function CheckoutCalendar({
  enabledWeekdays,
  selected,
  onSelect,
}: Props) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const isCurrentMonth =
    view.year === today.getFullYear() && view.month === today.getMonth();

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  function goPrev() {
    if (isCurrentMonth) return; // never go before this month
    setView((v) =>
      v.month === 0
        ? { year: v.year - 1, month: 11 }
        : { ...v, month: v.month - 1 }
    );
  }
  function goNext() {
    setView((v) =>
      v.month === 11
        ? { year: v.year + 1, month: 0 }
        : { ...v, month: v.month + 1 }
    );
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={isCurrentMonth}
          className="px-3 py-1 font-bold text-ink disabled:opacity-25"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span className="font-bold uppercase tracking-wide text-sm text-ink">
          {MONTH_LABELS[view.month]} {view.year}
        </span>
        <button
          type="button"
          onClick={goNext}
          className="px-3 py-1 font-bold text-ink"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 font-bold uppercase tracking-wide text-[10px] text-muted"
          >
            {label}
          </div>
        ))}

        {cells.map((day, idx) => {
          if (day === null) return <div key={`blank-${idx}`} />;

          const date = new Date(view.year, view.month, day);
          date.setHours(0, 0, 0, 0);
          const iso = toIso(view.year, view.month, day);
          const isPast = date < today;
          const isEnabledWeekday = enabledWeekdays.includes(date.getDay());
          const selectable = !isPast && isEnabledWeekday;
          const isSelected = selected === iso;

          return (
            <button
              key={iso}
              type="button"
              disabled={!selectable}
              onClick={() => onSelect(iso)}
              className={[
                "aspect-square rounded text-sm font-bold transition-colors",
                isSelected
                  ? "bg-black text-white"
                  : selectable
                  ? "bg-cream text-ink hover:bg-line"
                  : "text-line cursor-not-allowed",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
