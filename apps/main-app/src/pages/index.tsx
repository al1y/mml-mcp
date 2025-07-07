import Head from "next/head"
import Game from "../components/Game"
import ChatPanel from "../components/ChatPanel"
import McpClient from "../components/McpClient"

export default function Home() {
  return (
    <>
      <Head>
        <title>Main App</title>
        <meta name="description" content="Main App with Game Component" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <ChatPanel />
        <Game />
        <McpClient />
      </main>
    </>
  )
}
