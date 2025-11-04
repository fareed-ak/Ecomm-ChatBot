# 🛍️ E-Commerce AI ChatBot

An intelligent shopping assistant that helps users find products through natural language conversations. Built with React frontend and Node.js backend, featuring real-time product search and AI-powered recommendations.

![E-Commerce ChatBot](https://img.shields.io/badge/Status-Active-green) ![Node.js](https://img.shields.io/badge/Node.js-18+-blue) ![React](https://img.shields.io/badge/React-18+-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- **🤖 Intelligent Chat Interface**: Natural language product search and recommendations
- **🔍 Real-time Product Search**: Integration with Amazon API for live product data
- **🎯 Smart Filtering**: Filter by price, brand, color, and category
- **💾 Session Memory**: Remembers user preferences within conversation
- **📱 Responsive Design**: Works seamlessly on desktop and mobile
- **🎨 Modern UI**: Clean, intuitive interface with smooth animations
- **⚡ Fast Performance**: Optimized for quick product discovery

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- (Optional) RapidAPI key for live Amazon product data

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/fareed-ak/Ecomm-ChatBot.git
   cd Ecomm-ChatBot
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Create .env file in backend directory
   cd ../backend
   echo "RAPIDAPI_KEY=your_rapidapi_key_here" > .env
   echo "RAPIDAPI_HOST=amazon-price1.p.rapidapi.com" >> .env
   ```

4. **Start the application**
   ```bash
   # Terminal 1: Start backend
   cd backend
   npm run dev
   
   # Terminal 2: Start frontend
   cd frontend
   npm run dev
   ```

5. **Open your browser**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5000`

## 🏗️ Project Structure

```
Ecomm-ChatBot/
├── backend/                 # Node.js Express server
│   ├── server.js           # Main server file
│   ├── products.json       # Fallback product data
│   ├── package.json        # Backend dependencies
│   └── .env               # Environment variables
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   └── ProductGrid.jsx
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # Entry point
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite configuration
├── .gitignore              # Git ignore rules
└── README.md               # Project documentation
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **CSS3** - Responsive styling with flexbox/grid
- **Fetch API** - HTTP client for API calls

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management
- **File System** - Local product data fallback

### APIs & Services
- **RapidAPI** - Amazon product search
- **Amazon Price API** - Real-time product data

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Required for live product data
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=amazon-price1.p.rapidapi.com

# Optional: Custom port
PORT=5000
```

### API Setup

1. **Get RapidAPI Key**:
   - Sign up at [RapidAPI](https://rapidapi.com/)
   - Subscribe to [Amazon Price API](https://rapidapi.com/amazonpriceapi/api/amazon-price1/)
   - Copy your API key to `.env` file

2. **Fallback Mode**:
   - Without API key, the app uses local `products.json`
   - Limited to sample products but fully functional

## 💡 Usage Examples

### Basic Product Search
```
User: "Show me laptops"
Bot: "Found 8 laptops: [displays product grid]"
```

### Smart Filtering
```
User: "Black laptops under 50000"
Bot: "Found 5 black laptops under ₹50,000: [filtered results]"
```

### Conversational Context
```
User: "Show me phones"
Bot: "Found 12 phones: [displays results]"
User: "Under 20000"
Bot: "Found 6 phones under ₹20,000: [filtered previous results]"
```

## 🎯 Features in Detail

### Smart Search
- Natural language processing for product queries
- Category detection (laptops, phones, headphones, etc.)
- Brand recognition and filtering
- Price range understanding

### Session Memory
- Remembers previous searches within conversation
- Applies new filters to existing results
- Maintains conversation context

### Product Display
- Grid layout with product cards
- Product images, names, prices
- Store information and links
- Responsive design for all devices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check if port 5000 is available
netstat -ano | findstr :5000
# Kill process if needed
taskkill /PID [PID_NUMBER] /F
```

**Frontend can't connect to backend:**
- Ensure backend is running on port 5000
- Check CORS configuration
- Verify API endpoints in frontend code

**No products showing:**
- Check if RapidAPI key is configured
- Verify internet connection
- Check browser console for errors

### Debug Mode

Enable detailed logging by setting `NODE_ENV=development` in your `.env` file.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [RapidAPI](https://rapidapi.com/) for Amazon product data
- [React](https://reactjs.org/) for the amazing frontend framework
- [Express.js](https://expressjs.com/) for the robust backend framework
- [Vite](https://vitejs.dev/) for the blazing fast build tool

## 📞 Contact

**Fareed AK** - [@fareed-ak](https://github.com/fareed-ak)

Project Link: [https://github.com/fareed-ak/Ecomm-ChatBot](https://github.com/fareed-ak/Ecomm-ChatBot)

---

⭐ Star this repo if you found it helpful!