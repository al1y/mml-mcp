import { NextApiRequest, NextApiResponse } from "next"
import OpenAI from "openai"

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

  try {
    const { message, conversation = [] } = req.body

    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Message is required" })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ message: "OpenAI API key is not configured" })
    }

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
    })
  } catch (error) {
    console.error("OpenAI API error:", error)
    res.status(500).json({ message: "Failed to get response from ChatGPT" })
  }
}
