import React, { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"
import { Send, User, Bot, X, Zap, AlertTriangle } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  mcp_used?: boolean
  mcp_server_url?: string
  fallback?: boolean
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversation: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        mcp_used: data.mcp_used,
        mcp_server_url: data.mcp_server_url,
        fallback: data.fallback,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <>
      {/* Overlay chat history on the left */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 h-3/4 w-72 flex flex-col z-40 pointer-events-none">
        {/* Chat messages overlay */}
        <div className="flex-1 p-3 overflow-hidden">
          <ScrollArea className="h-full pointer-events-auto" ref={scrollRef}>
            <div className="space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-white/70 py-8">
                  {/* waiting for messages... */}
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex gap-2 max-w-[85%] ${
                        message.role === "user"
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {message.role === "user" ? (
                          <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                            <User className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                            <Bot className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <Card
                        className={`shadow-lg backdrop-blur-sm p-1 ${
                          message.role === "user"
                            ? "bg-blue-500/90 text-white border-blue-400/50"
                            : "bg-white/90 text-gray-900 border-white/50"
                        }`}
                      >
                        <CardContent className="p-1">
                          <div className="text-sm font-medium whitespace-pre-wrap leading-snug">
                            {message.content}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                            {message.role === "assistant" && (
                              <div className="flex items-center gap-1 text-xs">
                                {message.mcp_used && (
                                  <div className="flex items-center gap-1 text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                    <Zap className="h-3 w-3" />
                                    <span>MCP Tools</span>
                                  </div>
                                )}
                                {message.fallback && (
                                  <div className="flex items-center gap-1 text-amber-600 bg-amber-100 px-2 py-1 rounded">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>Fallback</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="flex-shrink-0">
                      <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                        <Bot className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <Card className="bg-white/90 text-gray-900 border-white/50 shadow-lg backdrop-blur-sm">
                      <CardContent className="!p-2">
                        <div className="flex space-x-1">
                          <div className="h-2 w-2 bg-current rounded-full animate-bounce" />
                          <div
                            className="h-2 w-2 bg-current rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="h-2 w-2 bg-current rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Input area at bottom center */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "1rem",
          zIndex: 50,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div className="w-[500px] bg-black/80 backdrop-blur-sm border-6 border-white/50 rounded-xl shadow-2xl">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-black/80 border-none text-white text-lg placeholder:text-white/70 focus:ring-0 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </>
  )
}
