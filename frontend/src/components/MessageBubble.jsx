import './MessageBubble.css'

function MessageBubble({ message }) {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className={`message-bubble ${message.sender}`}>
      <div className="message-content">
        {message.text}
      </div>
      <div className="message-time">
        {formatTime(message.timestamp || new Date())}
      </div>
    </div>
  )
}

export default MessageBubble