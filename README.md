# 🛍️ Smart E-Commerce AI ChatBot

An intelligent shopping assistant that helps users find **any product** on Amazon India through natural language conversations. Built with React frontend, Node.js backend, Google Gemini AI, and ScrapingBee for real-time product scraping.

![E-Commerce ChatBot](https://img.shields.io/badge/Status-Active-green) ![Node.js](https://img.shields.io/badge/Node.js-18+-blue) ![React](https://img.shields.io/badge/React-18+-blue) ![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange) ![ScrapingBee](https://img.shields.io/badge/Scraping-ScrapingBee-yellow)

## ✨ Features

- **🤖 Natural Language Understanding**: Ask in plain English - "Show me black shirts under 2000"
- **🔍 Universal Product Search**: Find ANY product - electronics, clothing, jewelry, home appliances, books, etc.
- **🧠 AI-Powered Intent Detection**: Google Gemini AI understands what you want
- **🕷️ Real-time Web Scraping**: ScrapingBee scrapes live Amazon India data
- **🎯 Smart Filtering**: Automatic price, brand, color, and category filtering
- **💾 Conversation Memory**: Remembers your search context within the session
- **📱 Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **⚡ Fast & Reliable**: Optimized for quick product discovery

## 🛠️ How It Works

```
User: "Show me Samsung phones under 30000"
    ↓
🧠 Gemini AI analyzes and extracts:
   • Category: "phone"
   • Brand: "Samsung" 
   • Max Price: 30000
    ↓
🕷️ ScrapingBee scrapes Amazon India:
   • Searches: "Samsung phone"
   • Parses product data from HTML
    ↓
⚙️ Backend filters results:
   • Only Samsung phones
   • Price ≤ ₹30,000
    ↓
📱 Frontend displays:
   • Beautiful product grid
   • Real prices, images, links
```

## 🎯 Supported Product Categories

Your chatbot can find **literally anything** on Amazon India:

### 📱 Electronics
- Laptops, phones, tablets, headphones, cameras, TVs, speakers, smartwatches

### 👕 Clothing & Fashion  
- Shirts, jeans, dresses, shoes, bags, jackets, sarees, kurtas

### 💎 Jewelry & Accessories
- Necklaces, earrings, bracelets, rings, gold/silver jewelry

### 🏠 Home & Kitchen
- Iron, mixer, pressure cooker, refrigerator, washing machine, microwave, AC, furniture

### 💄 Beauty & Health
- Shampoo, creams, perfumes, makeup, skincare products

### 📚 Books & Education
- Novels, textbooks, stationery, pens, notebooks

### 🏃 Sports & Fitness
- Gym equipment, cricket gear, fitness accessories

### 🧸 Toys & Games
- Children's toys, board games, puzzles

### 🚗 Automotive & Tools
- Car accessories, bike parts, tools

**...and ANY other product you can think of!**

## 🚀 Quick Setup Guide

### Prerequisites
- Node.js 18 or higher
- npm package manager
- Google Gemini API key (free)
- ScrapingBee API key (free tier available)

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/fareed-ak/Ecomm-ChatBot.git
cd Ecomm-ChatBot

# Install dependencies for both frontend and backend
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Get Your API Keys

#### 🧠 Google Gemini API Key (Required for AI)
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" → "Create API Key"
4. Copy your API key

#### 🕷️ ScrapingBee API Key (Required for Product Search)
1. Go to [ScrapingBee.com](https://www.scrapingbee.com/)
2. Sign up for a free account
3. Free tier includes: **1,000 API calls/month**
4. Go to your dashboard and copy the API key

### 3. Environment Setup

Create a `.env` file in the `backend` directory:

```bash
cd backend
```

Create `.env` file with your API keys:
```env
# Google Gemini AI for understanding user intent
GEMINI_API_KEY=your_actual_gemini_api_key_here

# ScrapingBee API for Amazon product scraping  
SCRAPINGBEE_API_KEY=your_actual_scrapingbee_api_key_here
```

**🔒 Important**: Never commit your `.env` file to Git! It's already in `.gitignore`.

### 4. Start the Application

```bash
# Terminal 1: Start Backend Server
cd backend
npm run dev
# Backend runs on: http://localhost:5000

# Terminal 2: Start Frontend  
cd frontend
npm run dev
# Frontend runs on: http://localhost:5173
```

### 5. Test Your Setup

1. **Backend API Test**: Visit http://localhost:5000/api/test
   ```json
   {
     "message": "Smart E-Commerce Chatbot Backend Ready!",
     "geminiConfigured": true,
     "scrapingbeeConfigured": true,
     "status": "Ready to search Amazon India products"
   }
   ```

2. **Frontend Test**: Visit http://localhost:5173
   - You should see the chat interface
   - Try: "Show me laptops under 50000"

## 💡 Usage Examples

### Basic Product Search
```
You: "Show me laptops"
Bot: "Found 12 laptop products:" [displays grid]
```

### Smart Price Filtering
```
You: "Samsung phones under 25000"
Bot: "Found 8 Samsung phones under ₹25,000:" [filtered results]
```

### Conversational Context
```
You: "Show me shirts"
Bot: "Found 15 shirt products:" [shows shirts]
You: "under 1500"
Bot: "Found 9 shirts under ₹1,500:" [filters previous results]
You: "black color"
Bot: "Found 4 black shirts under ₹1,500:" [further filtered]
```

### Any Product Category
```
You: "Gold jewelry above 10000"
You: "Steam iron under 3000"  
You: "Gym equipment"
You: "Books about business"
```

## 🔧 API Management

### ScrapingBee API Limits
- **Free Tier**: 1,000 requests/month
- **When limit reached**: Get a new API key from ScrapingBee
- **How to replace**: Update `SCRAPINGBEE_API_KEY` in `.env` file
- **No downtime**: Just restart the backend server

### Gemini AI Limits  
- **Free Tier**: Very generous limits for personal use
- **Rate limits**: Handled automatically with retry logic

## 🏗️ Project Structure

```
Ecomm-ChatBot/
├── backend/                    # Node.js Express server
│   ├── server.js              # Main server with AI + scraping logic
│   ├── .env                   # API keys (create this file)
│   ├── package.json           # Backend dependencies
│   └── products.json          # Fallback sample products
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── ChatWindow.jsx     # Main chat interface
│   │   │   ├── MessageBubble.jsx  # Chat message display
│   │   │   └── ProductGrid.jsx    # Product results grid
│   │   ├── App.jsx           # Main app component
│   │   └── main.jsx          # Entry point
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite build configuration
├── .gitignore                # Git ignore rules (includes .env)
└── README.md                 # This documentation
```

## 🔍 Technical Architecture

### Frontend (React + Vite)
- **Chat Interface**: Real-time messaging with beautiful UI
- **Product Grid**: Responsive grid layout for search results
- **State Management**: React hooks for chat history and products
- **API Communication**: Fetch API for backend communication

### Backend (Node.js + Express)
- **AI Integration**: Google Gemini for natural language understanding
- **Web Scraping**: ScrapingBee for Amazon product data extraction  
- **Intent Detection**: Extracts categories, brands, prices from user messages
- **Session Management**: Remembers user context during conversations
- **Error Handling**: Graceful fallbacks when APIs fail

### APIs Used
- **Google Gemini AI**: Understanding user intent and generating responses
- **ScrapingBee**: Scraping Amazon India search results reliably
- **Amazon India**: Source of all product data (prices, images, links)

## 🛠️ Troubleshooting

### Backend Won't Start
```bash
# Check if port 5000 is available
netstat -ano | findstr :5000

# If port is busy, kill the process
taskkill /PID [PID_NUMBER] /F
```

### No Products Showing
1. **Check API keys**: Ensure both keys are in `.env`
2. **Restart backend**: `npm run dev` in backend folder
3. **Check browser console**: Look for API errors
4. **Test backend**: Visit http://localhost:5000/api/test

### ScrapingBee Limit Reached
1. **Get new API key**: Sign up for another ScrapingBee account
2. **Update .env**: Replace `SCRAPINGBEE_API_KEY` with new key
3. **Restart backend**: Stop and start the server
4. **Alternative**: App falls back to sample products when scraping fails

### Gemini AI Errors
1. **Check API key**: Ensure valid key in `.env`
2. **Rate limits**: Wait a few minutes and try again
3. **Fallback**: App uses keyword matching when Gemini fails

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Contact

**Fareed AK** - [@fareed-ak](https://github.com/fareed-ak)

Project Link: [https://github.com/fareed-ak/Ecomm-ChatBot](https://github.com/fareed-ak/Ecomm-ChatBot)

## 🙏 Acknowledgments

- [Google Gemini AI](https://ai.google.dev/) for intelligent conversation capabilities
- [ScrapingBee](https://www.scrapingbee.com/) for reliable web scraping
- [React](https://reactjs.org/) for the amazing frontend framework
- [Express.js](https://expressjs.com/) for the robust backend framework
- [Vite](https://vitejs.dev/) for blazing fast development

---

⭐ **Star this repo if you found it helpful!**

**Happy Shopping! 🛍️**