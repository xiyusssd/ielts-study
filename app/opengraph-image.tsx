import { ImageResponse } from "next/og";

export const alt = "雅思学习助手 · AI 驱动的 IELTS 备考";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * 社交分享（Twitter / Slack / iMessage 等）缩略图。
 */
export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #4f46e5 0%, #a855f7 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: 80,
          position: "relative",
        }}
      >
        {/* 网格纹理 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            display: "flex",
          }}
        />

        {/* Logo 徽章 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
              fontWeight: 800,
              backdropFilter: "blur(10px)",
            }}
          >
            雅
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.9, display: "flex" }}>
            IELTS Study · 雅思学习助手
          </div>
        </div>

        {/* 主标题 */}
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>AI 驱动的</span>
          <span>雅思备考平台</span>
        </div>

        {/* 副标题 + 亮点 */}
        <div
          style={{
            marginTop: 32,
            fontSize: 26,
            opacity: 0.85,
            display: "flex",
          }}
        >
          5 维水平诊断 · 个性化规划 · 5 大模块闭环训练
        </div>

        {/* 底部标签行 */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            gap: 16,
            fontSize: 20,
          }}
        >
          {["FSRS 智能记忆", "AI 4 维批改", "Realtime 语音", "本地部署"].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "8px 20px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
                display: "flex",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
