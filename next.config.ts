import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Next 15 默认关闭 client router cache，重新启用大幅减少页面切换等待
  experimental: {
    staleTimes: {
      dynamic: 30,    // 动态页面客户端缓存 30 秒
      static: 180,    // 静态页面缓存 3 分钟
    },
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // 生产 build 时压缩
  compress: true,
  // 减少客户端 JS
  productionBrowserSourceMaps: false,
};

export default nextConfig;
