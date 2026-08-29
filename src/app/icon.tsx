import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/config";

export const runtime = "nodejs";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * Favicon. Same coin the masthead uses — orange disc, heavy dark ring, white
 * initial — so the tab matches the site. Drawn at 64px and downscaled by the
 * browser, which keeps the ring crisp at 16px.
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgb(17, 17, 17)",
        color: "rgb(255, 255, 255)",
        border: "5px solid rgb(17, 17, 17)",
        borderRadius: "50%",
        fontSize: 40,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {SITE_NAME.charAt(0).toUpperCase()}
    </div>,
    size,
  );
}
