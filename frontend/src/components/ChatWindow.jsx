import { useState, useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import './ChatWindow.css'

function ChatWindow({ messages, setMessages, setProducts }) {
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9))
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // Send to backend with session ID for memory management
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: inputMessage,
          sessionId: sessionId
        })
      })

      const data = await response.json()

      // Add bot response
      const botMessage = {
        id: Date.now() + 1,
        text: data.reply,
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])

      // Update products if any returned
      if (data.products && data.products.length > 0) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please check your connection and try again.',
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([
      { 
        id: 1, 
        text: "Hello! I'm your AI shopping assistant. Ask me about electronics, clothing, jewelry, or any products you're looking for!", 
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
    setProducts([]);
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h2>🤖 AI Shopping Assistant</h2>
        <div className="chat-header-actions">
          <div className="online-only-badge">
            🌐 Real-time Products
          </div>
          <button className="clear-chat-btn" onClick={handleClearChat}>
            Clear Chat
          </button>
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
            AI is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask about products (e.g., 'Show me laptops under ₹50,000')"
          className="chat-input"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default ChatWindow