import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * iOS 添加到主屏用的图标（180x180）。
 * 品牌渐变 + 中文"雅"字 + 底部小英文标签。
 */
export default function AppleIcon() {
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
          background: "linear-gradient(135deg, #4f46e5 0%, #a855f7 100%)",
          color: "white",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* 网格背景纹理 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            display: "flex",
          }}
        />
        <div
          style={{
            fontSize: 108,
            fontWeight: 800,
            letterSpacing: "-0.05em",
            lineHeight: 1,
            marginTop: -8,
            display: "flex",
          }}
        >
          雅
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "0.15em",
            marginTop: 8,
            opacity: 0.85,
            display: "flex",
          }}
        >
          IELTS STUDY
        </div>
      </div>
    ),
    { ...size },
  );
}
