import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * 浏览器 tab / 书签用的 favicon。
 * 品牌渐变背景 + 中文"雅"字，与登录页 hero logo 一致。
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5 0%, #a855f7 100%)",
          borderRadius: "20%",
          color: "white",
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: "-0.05em",
          fontFamily: "sans-serif",
        }}
      >
        雅
      </div>
    ),
    { ...size },
  );
}
