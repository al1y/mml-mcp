import * as esbuild from "esbuild"
import { copy } from "esbuild-plugin-copy"
import * as http from "http"
import * as fs from "fs"
import * as path from "path"

const buildMode = "--build"
const watchMode = "--watch"
const buildWatchOnlyMode = "--build-watch-only" // New mode for watch without dev server

const helpString = `Mode must be provided as one of ${buildMode}, ${watchMode}, or ${buildWatchOnlyMode}`

const args = process.argv.splice(2)

if (args.length !== 1) {
  console.error(helpString)
  process.exit(1)
}

const mode = args[0]

// Simple static file server for development
function createDevServer(buildDir: string) {
  const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    )
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    if (req.method === "OPTIONS") {
      res.writeHead(200)
      res.end()
      return
    }

    const filePath = path.join(
      buildDir,
      req.url === "/" ? "index.html" : req.url || "",
    )

    // Security check
    if (!filePath.startsWith(path.resolve(buildDir))) {
      res.writeHead(403)
      res.end("Forbidden")
      return
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404)
        res.end("Not Found")
        return
      }

      // Set content type
      const ext = path.extname(filePath)
      const contentTypes: { [key: string]: string } = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".glb": "model/gltf-binary",
        ".hdr": "application/octet-stream",
      }

      res.setHeader(
        "Content-Type",
        contentTypes[ext] || "application/octet-stream",
      )
      res.writeHead(200)
      res.end(data)
    })
  })

  return server
}

// Function to get a random available port
function getRandomPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer()
    server.listen(0, () => {
      const address = server.address()
      if (address && typeof address === "object") {
        const port = address.port
        server.close(() => resolve(port))
      } else {
        reject(new Error("Failed to get port"))
      }
    })
  })
}

const buildOptions: esbuild.BuildOptions = {
  entryPoints: {
    index: "src/index.tsx",
  },
  bundle: true,
  write: true,
  metafile: true,
  sourcemap: "linked",
  outdir: "./build/",
  assetNames: "[dir]/[name]-[hash]",
  preserveSymlinks: true,

  loader: {
    ".html": "text",
    ".mml": "text",
    ".svg": "file",
    ".png": "file",
    ".jpg": "file",
    ".glb": "file",
    ".hdr": "file",
  },
  outbase: "../../", // This is targeting the parent of the "assets" directory to avoid generated paths including a traversal
  sourceRoot: "./src",
  publicPath: "./",
  jsx: "automatic",
  jsxImportSource: "react",
  plugins: [
    copy({
      resolveFrom: "cwd",
      assets: [
        {
          from: ["./public/**/*"],
          to: ["./build/"],
        },
        {
          from: ["./assets/**/*"],
          to: ["./build/apps/game-only-client/assets/"],
        },
      ],
    }),
  ],
}

switch (mode) {
  case buildMode:
    esbuild.build(buildOptions).catch(() => process.exit(1))
    break
  case watchMode:
    // Get a random port and start the dev server
    getRandomPort()
      .then((port) => {
        const buildDir = path.resolve("./build")
        const server = createDevServer(buildDir)

        server.listen(port, () => {
          console.log(
            `🚀 Development server running at http://localhost:${port}`,
          )
          console.log(`📁 Serving files from: ${buildDir}`)
          console.log(`👀 Watching for changes...`)
        })

        // Start esbuild watcher
        esbuild
          .context({
            ...buildOptions,
            banner: {
              js: ` (() => new WebSocket((window.location.protocol === "https:" ? "wss://" : "ws://")+window.location.host+'/game-only-client').addEventListener('message', () => location.reload()))();`,
            },
          })
          .then((context) => context.watch())
          .catch(() => process.exit(1))
      })
      .catch((err) => {
        console.error("Failed to start dev server:", err)
        process.exit(1)
      })
    break
  case buildWatchOnlyMode:
    // Start esbuild watcher without dev server (files served by external server)
    console.log(`📁 Building to: ${path.resolve("./build")}`)
    console.log(`👀 Watching for changes...`)

    esbuild
      .context(buildOptions)
      .then((context) => context.watch())
      .catch(() => process.exit(1))
    break
  default:
    console.error(helpString)
}
