/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    // Externalize server-side dependencies to prevent webpack from bundling them
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push(
        // MCP server dependencies
        "@mml-mcp/mcp-server",
        "@mml-mcp/mml-client",
        "@mml-mcp/web-world-client",
        "@mml-mcp/viewer",
        "@mml-mcp/shared",
        // Puppeteer and related dependencies
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
      "@mml-mcp/viewer": "commonjs @mml-mcp/viewer",
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
      "@mml-mcp/mcp-server",
      "@mml-mcp/mml-client",
      "@mml-mcp/web-world-client",
      "@mml-mcp/viewer",
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
