import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import { getEntryWithRank, priceToBeat } from "@/lib/queries";

export const runtime = "nodejs";
export const alt = `Listing rank on ${SITE_NAME}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

/** The share card: rank huge, name under it, the takeover price as the dare. */
export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getEntryWithRank(id).catch(() => null);

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

      {entry ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 200,
              fontWeight: 800,
              color: "rgb(17, 17, 17)",
              lineHeight: 1,
            }}
          >
            #{entry.rank}
          </span>
          <span
            style={{
              fontSize: 58,
              fontWeight: 800,
              color: "rgb(17, 17, 17)",
              marginTop: 18,
            }}
          >
            {entry.displayName}
          </span>
        </div>
      ) : (
        <span
          style={{ fontSize: 64, fontWeight: 800, color: "rgb(17, 17, 17)" }}
        >
          This spot is open.
        </span>
      )}

      <span style={{ fontSize: 30, color: "rgb(140, 140, 140)" }}>
        {entry
          ? `Holding at ${formatUsd(entry.bidCents)} — take it for ${formatUsd(priceToBeat(entry.bidCents))}`
          : "New listings start at $1"}
      </span>
    </div>,
    size,
  );
}
