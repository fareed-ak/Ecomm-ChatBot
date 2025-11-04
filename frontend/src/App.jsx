import { useState, useEffect } from 'react'
import './App.css'
import ProductGrid from './components/ProductGrid'
import ChatWindow from './components/ChatWindow'

function App() {
  const [products, setProducts] = useState([])
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "Hello! I'm your AI shopping assistant. Ask me about electronics, clothing, jewelry, or any products you're looking for!", 
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
          Live Products Available
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
          <span className="footer-link">Made with &hearts; by Fareed</span>
          
        </div>
        <div className="footer-info">
          <span>🔒 Secure Connection</span>
          <span>•</span>
          <span>AI-Powered Shopping Assistant</span>
        </div>
      </footer>
    </div>
  )
}

export default App