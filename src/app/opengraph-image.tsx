import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import { getPriceForFirst, getTopEntry } from "@/lib/queries";

export const runtime = "nodejs";
export const alt = `${SITE_NAME} — rank is bought, not earned`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Regenerated as the board moves, so a share always shows the live price of
 * #1 — which is the number that makes people click.
 */
export const revalidate = 300;

export default async function OgImage() {
  const [top, priceForFirst] = await Promise.all([
    getTopEntry().catch(() => null),
    getPriceForFirst().catch(() => 100),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "rgb(255, 255, 255)",
        padding: "72px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span
          style={{ fontSize: 30, fontWeight: 700, color: "rgb(17, 17, 17)" }}
        >
          {SITE_NAME}
        </span>
        <span style={{ fontSize: 26, color: "rgb(140, 140, 140)" }}>
          rank is bought, not earned
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "none",
            color: "rgb(140, 140, 140)",
          }}
        >
          #1 currently costs
        </span>
        <span
          style={{
            fontSize: 190,
            fontWeight: 800,
            color: "rgb(17, 17, 17)",
            lineHeight: 1,
            marginTop: 12,
          }}
        >
          {formatUsd(priceForFirst)}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          borderTop: "3px solid rgb(17, 17, 17)",
          paddingTop: 28,
          fontSize: 30,
          color: "rgb(140, 140, 140)",
        }}
      >
        {top ? (
          <>
            <span style={{ color: "rgb(17, 17, 17)", fontWeight: 700 }}>
              #1
            </span>
            <span style={{ color: "rgb(17, 17, 17)" }}>{top.displayName}</span>
            <span>holds it at {formatUsd(top.bidCents)}</span>
          </>
        ) : (
          <span>The board is empty. $1 takes the top spot.</span>
        )}
      </div>
    </div>,
    size,
  );
}
