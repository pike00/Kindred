import baseConfig from "./vite.config"

const backendTarget = process.env.E2E_API_TARGET ?? "http://127.0.0.1:18001"

export default {
  ...baseConfig,
  server: {
    ...baseConfig.server,
    host: "127.0.0.1",
    hmr: false,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    ...baseConfig.preview,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
}
