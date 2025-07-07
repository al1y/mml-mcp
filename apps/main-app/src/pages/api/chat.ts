import { NextApiRequest, NextApiResponse } from "next"
import OpenAI from "openai"
import { getMcpServerConfig, getMcpServerUrl } from "../../lib/config"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  const { message, conversation = [] } = req.body

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Message is required" })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ message: "OpenAI API key is not configured" })
  }

  try {
    // Build conversation history
    const messages = [...conversation, { role: "user", content: message }]

    // Get MCP server configuration
    const requestOrigin =
      req.headers.origin ||
      `http://localhost:${req.headers.host?.split(":")[1] || "3000"}`
    const mcpConfig = getMcpServerConfig(requestOrigin)
    const mcpServerUrl = getMcpServerUrl(requestOrigin)

    console.log(`🔗 Using MCP server URL: ${mcpServerUrl}`)

    // Use OpenAI's new Responses API with MCP integration
    const response = await openai.responses.create({
      model: "gpt-4o-mini", // Use a model that supports the Responses API
      input: messages,
      tools: [mcpConfig],
      text: {
        format: {
          type: "text",
        },
      },
      temperature: 0.7,
      max_output_tokens: 1000,
    })

    // Extract the response content
    let reply = "Sorry, I could not generate a response."

    if (response.output && response.output.length > 0) {
      const lastMessage = response.output[response.output.length - 1]
      if (lastMessage.type === "message" && lastMessage.content) {
        const textContent = lastMessage.content.find(
          (c) => c.type === "output_text",
        )
        if (textContent) {
          reply = textContent.text
        }
      }
    }

    // Build the updated conversation
    const updatedConversation = [
      ...messages,
      { role: "assistant", content: reply },
    ]

    res.status(200).json({
      message: reply,
      conversation: updatedConversation,
      mcp_used: true,
      mcp_server_url: mcpServerUrl,
    })
  } catch (error) {
    console.error("OpenAI API error:", error)

    // Fallback to regular chat completion if MCP fails
    try {
      const messages = [...conversation, { role: "user", content: message }]

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      })

      const reply =
        completion.choices[0]?.message?.content ||
        "Sorry, I could not generate a response."

      res.status(200).json({
        message: reply,
        conversation: [...messages, { role: "assistant", content: reply }],
        mcp_used: false,
        fallback: true,
      })
    } catch (fallbackError) {
      console.error("Fallback API error:", fallbackError)
      res.status(500).json({ message: "Failed to get response from OpenAI" })
    }
  }
}
