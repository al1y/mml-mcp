import React, { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"
import { Send, User, Bot, X } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
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
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
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
      <div className="fixed left-0 top-0 h-full w-80 flex flex-col z-40 pointer-events-none">
        {/* Chat messages overlay */}
        <div className="flex-1 p-4 overflow-hidden">
          <ScrollArea className="h-full pointer-events-auto" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-white/70 py-8">
                  waiting for messages...
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
                          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                            <User className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                      <Card
                        className={`shadow-lg backdrop-blur-sm ${
                          message.role === "user"
                            ? "bg-blue-500/90 text-white border-blue-400/50"
                            : "bg-white/90 text-gray-900 border-white/50"
                        }`}
                      >
                        <CardContent className="p-4">
                          <p className="text-base font-medium whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                          <p className="text-sm opacity-70 mt-2">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
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
                      <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <Card className="bg-white/90 text-gray-900 border-white/50 shadow-lg backdrop-blur-sm">
                      <CardContent className="p-4">
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
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[500px] z-50">
        <div className="bg-transparent backdrop-blur-sm border-2 border-white/50 rounded-xl shadow-2xl p-4">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-transparent border-none text-white text-base placeholder:text-white/70 focus:ring-0 focus:outline-none"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="lg"
              className="bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
