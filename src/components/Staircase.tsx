import Link from "next/link";
import { faviconProxy, hostOf } from "@/lib/favicon";
import { formatUsd } from "@/lib/format";
import { priceToBeat, type RankedEntry } from "@/lib/queries";

/** How many steps the flight has. The rest of the board lives in the table. */
export const STAIRCASE_STEPS = 8;

/* --- The solid ------------------------------------------------------------
 *
 * The product photographed, except there is no product: an eight-step flight
 * defined in three dimensions and projected to the screen, standing on white
 * like an object on a studio sweep. Every step is a rank somebody can buy, and
 * a taken step wears its owner's mark on the tread the way a sticker sits on a
 * surface.
 *
 * Axes: x runs up the flight, y across its width, z is height. The camera sits
 * high and off one corner, so the visible planes are the tread, the riser and
 * the side wall — shaded light, mid and dark, as one white object lit from
 * above. The flight descends toward the viewer, so no step can hide the one
 * behind it and the solid paints back to front with no depth sorting.
 */

const K = Math.cos(Math.PI / 6); // horizontal spread of the ground plane
const M = 0.38; // vertical squash — how high above the flight the camera sits
const RUN = 64; // tread depth
const WIDTH = 185; // step width
const RISE = 40; // step height

type P3 = [number, number, number];

function project([x, y, z]: P3): [number, number] {
  return [(x - y) * K, (x + y) * M - z];
}

function poly(points: P3[]): string {
  return points.map((p) => project(p).join(",")).join(" ");
}

/**
 * An SVG matrix that lays flat content onto a face of the solid. `u` and `v`
 * are the 3D vectors one local unit travels along, so ordinary 2D drawing
 * inside the group lands on the face already skewed into the projection.
 */
function onFace(origin: P3, u: P3, v: P3): string {
  const o = project(origin);
  const pu = project([origin[0] + u[0], origin[1] + u[1], origin[2] + u[2]]);
  const pv = project([origin[0] + v[0], origin[1] + v[1], origin[2] + v[2]]);
  return `matrix(${pu[0] - o[0]},${pu[1] - o[1]},${pv[0] - o[0]},${pv[1] - o[1]},${o[0]},${o[1]})`;
}

export function Staircase({ rows }: { rows: RankedEntry[] }) {
  const steps = Array.from({ length: STAIRCASE_STEPS }, (_, j) => {
    const position = j + 1;
    const x0 = j * RUN;
    return {
      position,
      x0,
      x1: x0 + RUN,
      height: (STAIRCASE_STEPS - j) * RISE,
      entry: rows[j],
    };
  });

  // Fit the viewBox to the solid rather than guessing at it.
  const pts = steps
    .flatMap(({ x0, x1, height }): P3[] => [
      [x0, 0, 0],
      [x1, 0, 0],
      [x0, WIDTH, 0],
      [x1, WIDTH, 0],
      [x0, 0, height],
      [x1, WIDTH, height],
    ])
    .map(project);
  const pad = 40;
  const minX = Math.min(...pts.map((p) => p[0])) - pad;
  const maxX = Math.max(...pts.map((p) => p[0])) + pad;
  const minY = Math.min(...pts.map((p) => p[1])) - pad;
  const maxY = Math.max(...pts.map((p) => p[1])) + pad + 30;

  return (
    <figure className="relative">
      <svg
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        className="w-full select-none"
        role="group"
        aria-label="The flight. Every step on it is for sale."
      >
        <defs>
          {/* The sweep the object stands on, and the shadow it casts onto it. */}
          <filter id="cast" x="-40%" y="-70%" width="180%" height="260%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <linearGradient id="sheen" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon
          points={poly([
            [-10, -10, 0],
            [STAIRCASE_STEPS * RUN + 26, -10, 0],
            [STAIRCASE_STEPS * RUN + 26, WIDTH + 26, 0],
            [-10, WIDTH + 26, 0],
          ])}
          filter="url(#cast)"
          style={{ fill: "rgb(var(--ink-rgb))", opacity: 0.13 }}
        />

        {steps.map(({ position, x0, x1, height, entry }) => {
          const cost = entry ? priceToBeat(entry.bidCents) : 100;
          const host = entry ? hostOf(entry.url) : null;
          const icon = entry
            ? (entry.faviconUrl ?? (host ? faviconProxy(host) : null))
            : null;

          const tread: P3[] = [
            [x0, 0, height],
            [x1, 0, height],
            [x1, WIDTH, height],
            [x0, WIDTH, height],
          ];
          const riser: P3[] = [
            [x1, 0, height],
            [x1, WIDTH, height],
            [x1, WIDTH, height - RISE],
            [x1, 0, height - RISE],
          ];
          const wall: P3[] = [
            [x0, WIDTH, height],
            [x1, WIDTH, height],
            [x1, WIDTH, 0],
            [x0, WIDTH, 0],
          ];

          // The slot: a panel let into the tread, sized like a real one.
          const slotW = 46;
          const slotH = 34;
          const onTread = onFace(
            [x0 + (RUN - slotW) / 2, WIDTH / 2 - slotH / 2, height],
            [1, 0, 0],
            [0, 1, 0],
          );
          const onRiser = onFace(
            [x1, WIDTH - 16, height],
            [0, -1, 0],
            [0, 0, -1],
          );
          const tag = project([x1 - RUN / 2, WIDTH / 2, height]);

          return (
            <Link
              key={position}
              href={`/?amount=${cost / 100}#bid`}
              className="step3d"
              aria-label={
                entry
                  ? `Outbid ${entry.displayName} for step ${position} at ${formatUsd(cost)}`
                  : `Claim the available step ${position} for ${formatUsd(cost)}`
              }
            >
              <g
                className="climb"
                style={{ "--i": position } as React.CSSProperties}
              >
                <g className="step3d-lift">
                  <title>
                    {entry
                      ? `${entry.displayName} holds step ${position} at ${formatUsd(entry.bidCents)}`
                      : `Step ${position} is available`}
                  </title>

                  {/* One white object, three planes, lit from above. */}
                  <polygon
                    points={poly(wall)}
                    fill="#dbdbdb"
                    style={{ fill: "rgb(var(--face3-rgb))" }}
                    stroke="rgb(var(--face3-rgb))"
                    strokeWidth={6}
                    strokeLinejoin="round"
                  />
                  <polygon
                    points={poly(riser)}
                    fill="#e9e9e9"
                    style={{ fill: "rgb(var(--face2-rgb))" }}
                    stroke="rgb(var(--face2-rgb))"
                    strokeWidth={6}
                    strokeLinejoin="round"
                  />
                  <polygon
                    points={poly(tread)}
                    fill="#f7f7f7"
                    style={{ fill: "rgb(var(--face1-rgb))" }}
                    stroke="rgb(var(--face1-rgb))"
                    strokeWidth={6}
                    strokeLinejoin="round"
                  />
                  <polygon points={poly(tread)} fill="url(#sheen)" />
                  <polygon
                    className="step3d-hl"
                    points={poly(tread)}
                    style={{ fill: "rgb(var(--accent-rgb))", opacity: 0.12 }}
                  />

                  {/* The slot cut into the tread. */}
                  <g transform={onTread}>
                    <rect
                      width={slotW}
                      height={slotH}
                      rx={5}
                      fill="#ffffff"
                      style={{
                        fill: entry
                          ? "rgb(var(--paper-rgb))"
                          : "rgb(var(--face2-rgb))",
                        stroke: "rgb(var(--edge-rgb))",
                        strokeWidth: 1,
                      }}
                    />
                    {entry ? (
                      <>
                        <text
                          x={slotW / 2}
                          y={slotH / 2 + 6}
                          textAnchor="middle"
                          style={{
                            fill: "rgb(var(--dim-rgb))",
                            fontSize: 16,
                            fontWeight: 600,
                          }}
                        >
                          {entry.displayName.charAt(0).toUpperCase()}
                        </text>
                        {icon ? (
                          <image
                            href={icon}
                            x={slotW / 2 - 11}
                            y={slotH / 2 - 11}
                            width={22}
                            height={22}
                            preserveAspectRatio="xMidYMid meet"
                          />
                        ) : null}
                      </>
                    ) : (
                      <text
                        x={slotW / 2}
                        y={slotH / 2 + 3}
                        textAnchor="middle"
                        className="font-mono"
                        style={{
                          fill: "rgb(var(--dim-rgb))",
                          fontSize: 6.5,
                          letterSpacing: "0.12em",
                        }}
                      >
                        AVAILABLE
                      </text>
                    )}
                  </g>

                  {/* Printed on the riser. */}
                  <g transform={onRiser}>
                    <text
                      x={0}
                      y={26}
                      className="font-display"
                      style={{
                        fill: entry
                          ? "rgb(var(--ink-rgb))"
                          : "rgb(var(--dim-rgb))",
                        fontSize: 18,
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {entry ? formatUsd(entry.bidCents) : formatUsd(cost)}
                    </text>
                    <text
                      x={WIDTH - 44}
                      y={26}
                      textAnchor="end"
                      className="font-mono"
                      style={{
                        fill: "rgb(var(--dim-rgb))",
                        fontSize: 12,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {String(position).padStart(2, "0")}
                    </text>
                  </g>

                  {/* The offer, on whichever step is under the cursor. */}
                  <g
                    className="step3d-tag"
                    transform={`translate(${tag[0]}, ${tag[1] - 22})`}
                  >
                    <rect
                      x={-49}
                      y={-14}
                      width={98}
                      height={26}
                      rx={8}
                      style={{ fill: "rgb(var(--ink-rgb))" }}
                    />
                    <text
                      x={0}
                      y={4}
                      textAnchor="middle"
                      style={{
                        fill: "rgb(var(--paper-rgb))",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {entry ? "Outbid" : "Claim"} {formatUsd(cost)}
                    </text>
                  </g>
                </g>
              </g>
            </Link>
          );
        })}
      </svg>
    </figure>
  );
}
