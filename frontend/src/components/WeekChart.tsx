import { useState } from "preact/hooks";
import type { Adherence } from "../lib/api";
import { fmtDay, fmtWeekday } from "../lib/format";
import { useT } from "../lib/i18n";

type Day = Adherence["days"][number];

// Bottom -> top. Adjacent pairs validated for colour-blind separation (dataviz validator).
const SERIES = [
  { key: "taken", label: "Taken", color: "var(--taken)" },
  { key: "skipped", label: "Not taken", color: "var(--skipped)" },
  { key: "missed", label: "Missed", color: "var(--missed)" },
] as const;

const W = 700;
const H = 280;
const TOP = 36; // room for the % label above each bar
const BOTTOM = 68; // two-line day labels (weekday, date)
const GAP = 2; // surface gap between stacked segments

export function WeekChart({ days, today }: { days: Day[]; today: string }) {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(1, ...days.map((d) => d.taken + d.skipped + d.missed));
  const slot = W / days.length;
  const barW = Math.min(56, slot * 0.55);
  const plotH = H - TOP - BOTTOM;
  const sel = days.find((d) => d.date === selected);
  const describe = (d: Day) =>
    t("{day}: {taken} taken, {skipped} not taken, {missed} missed", {
      day: fmtDay(d.date, today),
      taken: d.taken,
      skipped: d.skipped,
      missed: d.missed,
    });

  return (
    <figure class="chart">
      <figcaption class="chart-title">{t("Medicines each day")}</figcaption>
      <ul class="legend" aria-label={t("Legend")}>
        {SERIES.map((s) => (
          <li key={s.key}>
            <span class="legend-swatch" style={{ background: s.color }} />
            {t(s.label)}
          </li>
        ))}
      </ul>
      <div class="chart-plot">
        <svg class="chart-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <line
            x1="0"
            x2={W}
            y1={H - BOTTOM}
            y2={H - BOTTOM}
            stroke="var(--border)"
            stroke-width="2"
          />
          {days.map((d, i) => {
            const cx = slot * i + slot / 2;
            let y = H - BOTTOM;
            const total = d.taken + d.skipped + d.missed;
            const segs = SERIES.map((s) => {
              const h = (d[s.key] / max) * plotH;
              y -= h;
              return { ...s, y, h };
            }).filter((s) => s.h > 0);
            return (
              <g key={d.date}>
                {segs.map((s, j) => (
                  <rect
                    key={s.key}
                    x={cx - barW / 2}
                    y={s.y + (j === segs.length - 1 ? 0 : GAP)}
                    width={barW}
                    height={Math.max(0, s.h - (j === segs.length - 1 ? 0 : GAP))}
                    rx={j === segs.length - 1 ? 4 : 0}
                    fill={s.color}
                  />
                ))}
                {total > 0 && d.percent !== null && (
                  <text x={cx} y={y - 10} text-anchor="middle" class="chart-value">
                    {d.percent}%
                  </text>
                )}
                {/* short labels that never collide: weekday on one line, date number below */}
                <text x={cx} y={H - 36} text-anchor="middle" class="chart-axis">
                  {d.date === today ? t("Today") : fmtWeekday(d.date)}
                </text>
                <text x={cx} y={H - 10} text-anchor="middle" class="chart-axis">
                  {Number(d.date.slice(8))}
                </text>
              </g>
            );
          })}
        </svg>
        {/* Real buttons over each column: bigger hit target than the bar, keyboard + screen reader friendly */}
        <div class="chart-hits" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
          {days.map((d) => (
            <button
              key={d.date}
              type="button"
              class="chart-hit"
              aria-pressed={selected === d.date}
              aria-label={describe(d)}
              onClick={() => setSelected(d.date)}
            />
          ))}
        </div>
      </div>

      <p class="chart-detail" aria-live="polite">
        {sel ? `${describe(sel)}.` : t("Tap a day to see its numbers.")}
      </p>

      <details class="chart-table">
        <summary>{t("Show as a table")}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{t("Day")}</th>
              <th scope="col">{t("Taken")}</th>
              <th scope="col">{t("Not taken")}</th>
              <th scope="col">{t("Missed")}</th>
              <th scope="col">%</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date}>
                <th scope="row">{fmtDay(d.date, today)}</th>
                <td>{d.taken}</td>
                <td>{d.skipped}</td>
                <td>{d.missed}</td>
                <td>{d.percent === null ? "–" : `${d.percent}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
