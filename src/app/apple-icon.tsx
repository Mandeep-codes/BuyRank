import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/config";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS. Squircle, not a circle — iOS masks it itself. */
export default function AppleIcon() {
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
        fontSize: 118,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {SITE_NAME.charAt(0).toUpperCase()}
    </div>,
    size,
  );
}
