import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { AppToaster } from "@/components/app-toaster";
import { PWAInit } from "@/components/pwa-init";

// 展示字体：标题与数字用 Sora（几何感、数字漂亮），中文回落系统字体。
const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "雅思学习助手 · AI 驱动的 IELTS 备考",
    template: "%s · 雅思学习助手",
  },
  description: "5 维水平诊断 · 个性化规划 · 词汇 SRS · AI 批改 · 语音对话",
  applicationName: "雅思学习助手",
  keywords: ["雅思", "IELTS", "AI 备考", "英语学习", "FSRS", "口语训练"],
  authors: [{ name: "IELTS Study" }],
  openGraph: {
    title: "雅思学习助手",
    description: "AI 驱动的 IELTS 备考平台 · 5 维诊断 · 个性化规划 · 5 大模块闭环",
    type: "website",
    locale: "zh_CN",
    siteName: "雅思学习助手",
  },
  twitter: {
    card: "summary_large_image",
    title: "雅思学习助手",
    description: "AI 驱动的 IELTS 备考平台",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
};

// 在页面加载前立刻应用主题（避免 flash of unstyled content）
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={sora.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <AppToaster />
        <PWAInit />
      </body>
    </html>
  );
}
