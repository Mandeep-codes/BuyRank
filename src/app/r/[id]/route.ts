import { NextResponse } from "next/server";
import { SITE_URL, UTM_SOURCE } from "@/lib/config";
import { recordClick } from "@/lib/queries";
import { withUtm } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every outbound link goes through here so bidders can see what they bought.
 *
 * A 302 with no-store matters more than it looks: the default redirect() helper
 * emits a 307, which browsers and proxies happily cache — and a cached redirect
 * never reaches this handler again, so the click count silently stops moving.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const home = new URL("/", SITE_URL);

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.redirect(home, 302);
  }

  let destination: string | null = null;
  try {
    destination = await recordClick(id);
  } catch (error) {
    console.error("[click]", error);
  }

  if (!destination) return NextResponse.redirect(home, 302);

  return NextResponse.redirect(withUtm(destination, UTM_SOURCE), {
    status: 302,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
