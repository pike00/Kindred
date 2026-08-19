import baseConfig from "./vite.config"

const tailnetHost = process.env.TAILNET_HOST ?? "127.0.0.1"
const tailnetMagicDns = process.env.TAILNET_MAGICDNS ?? "localhost"
const backendUrl = process.env.KINDRED_BACKEND_URL ?? "http://127.0.0.1:8000"

export default {
  ...baseConfig,
  server: {
    ...baseConfig.server,
    host: tailnetHost,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
}
