/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [
    "@mml-mcp/mcp-server",
    "@mml-mcp/mml-client",
    "@mml-mcp/web-world-client",
    "@mml-mcp/viewer",
    "@mml-mcp/shared",
  ],
  webpack: (config, { isServer }) => {
    // Externalize server-side dependencies to prevent webpack from bundling them
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push(
        // Puppeteer and related dependencies (but not MCP packages since they're transpiled)
        "puppeteer",
        "puppeteer-core",
        "canvas",
        "jsdom",
        "three",
        "gl",
      )
    }

    // Don't bundle these packages for the client
    config.externals = config.externals || []
    config.externals.push({
      puppeteer: "commonjs puppeteer",
      "puppeteer-core": "commonjs puppeteer-core",
      canvas: "commonjs canvas",
      jsdom: "commonjs jsdom",
      gl: "commonjs gl",
    })

    return config
  },
  experimental: {
    // Enable server components
    serverComponentsExternalPackages: [
      "puppeteer",
      "puppeteer-core",
      "canvas",
      "jsdom",
      "three",
      "gl",
    ],
  },
}

module.exports = nextConfig
