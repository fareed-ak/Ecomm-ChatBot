import { useState, useEffect } from 'react'
import './App.css'
import ProductGrid from './components/ProductGrid'
import ChatWindow from './components/ChatWindow'

function App() {
  const [products, setProducts] = useState([])
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "Hello! I'm your AI shopping assistant. I can help you find products on Amazon India.\n\nAsk me about:\n• Laptops, phones, headphones, etc.\n• Products under a certain price\n• Products with specific colors or brands\n\nExamples:\n• 'Show me laptops under ₹50,000'\n• 'I want a Samsung phone'\n• After a search, try 'under ₹30,000' or 'black color'", 
      sender: 'bot' 
    }
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Test backend connection on startup
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/test')
        if (!response.ok) throw new Error('Backend not responding')
        const data = await response.json()
        console.log('Backend connected:', data.message)
      } catch (err) {
        setError('Unable to connect to backend. Please make sure the server is running.')
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "⚠️ Backend connection issue. Some features may not work properly.",
          sender: 'bot'
        }])
      } finally {
        setLoading(false)
      }
    }

    testConnection()
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <h2>Starting E-Commerce Chatbot...</h2>
        <p>Connecting to services...</p>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🛍️ E-Commerce AI Assistant</h1>
        <div className="header-status">
          <span className="status-indicator"></span>
          Live Products from Amazon India
        </div>
      </header>
      
      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}
      
      <div className="main-content">
        <div className="products-section">
          <ProductGrid products={products} />
        </div>
        
        <div className="chat-section">
          <ChatWindow 
            messages={messages} 
            setMessages={setMessages}
            setProducts={setProducts}
          />
        </div>
      </div>

      <footer className="app-footer">
        <div className="footer-links">
          <span className="footer-link">&copy; E-Commerce ChatBot | All rights reserved</span>
        </div>
        <div className="footer-info">
          <span>🔒 Secure Connection</span>
          <span>•</span>
          <span>Powered by AI</span>
        </div>
      </footer>
    </div>
  )
}

export default App