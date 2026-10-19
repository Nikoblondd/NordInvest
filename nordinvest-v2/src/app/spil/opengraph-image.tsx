import { ImageResponse } from "next/og";

// Next.js OG image generator — served automatically at
// /spil/opengraph-image, replacing the missing static /og/spil.png.
// 1200×630 is the canonical social-share size.

export const runtime = "edge";
export const alt = "Boligpris Spil — Gæt Prisen på Boligen | NordInvest";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f172a 0%, #1e40af 100%)",
          padding: "72px",
          fontFamily: "sans-serif",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            N
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
            NordInvest
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              padding: "8px 16px",
              background: "rgba(59, 130, 246, 0.25)",
              border: "1px solid rgba(147, 197, 253, 0.4)",
              borderRadius: 999,
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "#bfdbfe",
            }}
          >
            Gratis · Ingen login · Dansk
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            Boligpris Spil
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 600,
              color: "#cbd5e1",
              lineHeight: 1.15,
              maxWidth: 1000,
            }}
          >
            Gæt prisen på rigtige danske boliger. Tag Dagens 5.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#94a3b8",
            borderTop: "1px solid rgba(148, 163, 184, 0.25)",
            paddingTop: 24,
          }}
        >
          <div>nordinvest.io/spil</div>
          <div>Data: Boligsiden</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
