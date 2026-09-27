import { useState } from "preact/hooks";
import type { Adherence } from "../lib/api";
import { fmtDay } from "../lib/format";

type Day = Adherence["days"][number];

// Bottom -> top. Adjacent pairs validated for colour-blind separation (dataviz validator).
const SERIES = [
  { key: "taken", label: "Taken", color: "var(--taken)" },
  { key: "skipped", label: "Skipped", color: "var(--skipped)" },
  { key: "missed", label: "Missed", color: "var(--missed)" },
] as const;

const W = 700;
const H = 280;
const TOP = 36; // room for the % label above each bar
const BOTTOM = 44; // day labels
const GAP = 2; // surface gap between stacked segments

export function WeekChart({ days, today }: { days: Day[]; today: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(1, ...days.map((d) => d.taken + d.skipped + d.missed));
  const slot = W / days.length;
  const barW = Math.min(56, slot * 0.55);
  const plotH = H - TOP - BOTTOM;
  const sel = days.find((d) => d.date === selected);

  return (
    <figure class="chart">
      <figcaption class="chart-title">Doses each day</figcaption>
      <ul class="legend" aria-label="Legend">
        {SERIES.map((s) => (
          <li key={s.key}>
            <span class="legend-swatch" style={{ background: s.color }} />
            {s.label}
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
                <text x={cx} y={H - 14} text-anchor="middle" class="chart-axis">
                  {fmtDay(d.date, today).replace("Yesterday", "Yest.")}
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
              aria-label={`${fmtDay(d.date, today)}: ${d.taken} taken, ${d.skipped} skipped, ${d.missed} missed`}
              onClick={() => setSelected(d.date)}
            />
          ))}
        </div>
      </div>

      <p class="chart-detail" aria-live="polite">
        {sel
          ? `${fmtDay(sel.date, today)}: ${sel.taken} taken, ${sel.skipped} skipped, ${sel.missed} missed${sel.pending ? `, ${sel.pending} still to come` : ""}.`
          : "Tap a day to see its numbers."}
      </p>

      <details class="chart-table">
        <summary>Show as a table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Taken</th>
              <th scope="col">Skipped</th>
              <th scope="col">Missed</th>
              <th scope="col">Taken %</th>
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
