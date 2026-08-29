import { SITE_NAME } from "@/lib/config";
import { getEntryWithRank } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function svg(label: string, active: boolean): string {
  const width = 36 + label.length * 8.4;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="44" role="img" aria-label="${label}">
  <rect width="100%" height="100%" rx="12" fill="${active ? "rgb(17, 17, 17)" : "rgb(140, 140, 140)"}"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="-apple-system,'Segoe UI',Roboto,sans-serif" font-size="15" font-weight="700" fill="rgb(255, 255, 255)">${label}</text>
</svg>`;
}

/**
 * The embeddable rank badge. Live: the rank in the image moves with the
 * board, which is the whole point of embedding it — and a five-minute CDN
 * cache keeps hotlinks from becoming a database tap.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const headers = {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  };

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response(svg(`on ${SITE_NAME}`, false), { headers });
  }

  try {
    const entry = await getEntryWithRank(id);
    const label = entry ? `#${entry.rank} on ${SITE_NAME}` : `on ${SITE_NAME}`;
    return new Response(svg(label, Boolean(entry)), { headers });
  } catch (error) {
    console.error("[badge]", error);
    return new Response(svg(`on ${SITE_NAME}`, false), { headers });
  }
}
