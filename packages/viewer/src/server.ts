import express, { Application } from "express"
import enableWs from "express-ws"
import * as path from "path"
import * as url from "url"

const dirname = url.fileURLToPath(new URL(".", import.meta.url))

export interface MMLObjectInstance {
  id: string
  name: string
  url: string
  enabled: boolean
  source: {
    type: "source"
    source: string
  }
}

export function createViewerServer(
  port: number,
  mmlObjectServerUrl: string,
): Application {
  const expressApp = express()
  const wsApp = enableWs(expressApp)
  const app = wsApp.app

  app.enable("trust proxy")

  // Allow all origins
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    next()
  })

  app.get("/", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        add an ID URL param
      </html>
    `)
  })

  app.get("/screenshot/:id", async (req, res) => {
    const { id } = req.params

    const url = `http://localhost:${port}/mml?id=${id}`

    const html = `<html><script src="${req.secure ? "https" : "http"}://${req.get(
      "host",
    )}/client/index.js?defineGlobals=true&url=${url}"></script></html>`

    res.send(html)
  })

  app.get("/mml", async (req, res) => {
    const { id: mmlObjectId } = req.query

    const fetchObjectPath = "v1/mml-objects/local-project/object-instances"
    const mmlObjectFetchPath = `${mmlObjectServerUrl}/${fetchObjectPath}/${mmlObjectId}`

    const mmlObjectResponse = await fetch(mmlObjectFetchPath)
    if (!mmlObjectResponse.ok) {
      res.status(404).send(`MML Object not found: ${mmlObjectId}`)
      return
    }
    const mmlObject = (await mmlObjectResponse.json()) as MMLObjectInstance

    res.send(mmlObject.source.source)
  })

  app.use(
    "/client/",
    express.static(
      path.resolve(
        dirname,
        "../../../node_modules/@mml-io/mml-web-client/build/",
      ),
    ),
  )

  return app as Application
}
