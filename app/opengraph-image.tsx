import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = siteConfig.title;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0c1f3d 0%, #0ea5e9 100%)",
          position: "relative",
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: "0",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Shield */}
        <div
          style={{
            display: "flex",
            width: "120px",
            height: "120px",
            borderRadius: "32px",
            background: "linear-gradient(135deg, #2563eb, #38bdf8)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none">
            <path
              d="M12 2l8 3v6c0 5.5-3.5 9.5-8 11-4.5-1.5-8-5.5-8-11V5l8-3z"
              stroke="white"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M9 12l2 2 4-4.5"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "40px",
          }}
        >
          <div style={{ display: "flex", fontSize: "72px", fontWeight: 800, color: "#ffffff" }}>
            Riyad{" "}
            <span style={{ color: "#7dd3fc" }}>Sarkar</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "30px",
              color: "rgba(255,255,255,0.92)",
              marginTop: "16px",
              fontWeight: 600,
            }}
          >
            Cyber Security Specialist · Digital Recovery Expert
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "22px",
              color: "rgba(186,230,253,0.9)",
              marginTop: "28px",
            }}
          >
            <span
              style={{
                display: "flex",
                width: "10px",
                height: "10px",
                borderRadius: "999px",
                background: "#34d399",
                marginRight: "12px",
              }}
            />
            <span>500+ Recoveries · 99% Success · Bangladesh</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
