import baseConfig from "./vite.config"

const backendTarget = process.env.E2E_API_TARGET ?? "http://127.0.0.1:18001"
const tailnetHost = process.env.TAILNET_HOST
const allowedHosts = process.env.TAILNET_MAGICDNS
  ? [process.env.TAILNET_MAGICDNS]
  : []

export default {
  ...baseConfig,
  server: {
    ...baseConfig.server,
    host: tailnetHost,
    allowedHosts,
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
    host: tailnetHost,
    allowedHosts,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
}
