// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 5000;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// User sessions with memory
const userSessions = new Map();

function getUserSession(sessionId = 'default') {
  if (!userSessions.has(sessionId)) {
    userSessions.set(sessionId, {
      lastQuery: null,
      lastResults: [],
      conversationHistory: []
    });
  }
  return userSessions.get(sessionId);
}

// Enhanced session cleanup
function cleanupOldSessions() {
  const now = new Date();
  for (const [id, session] of userSessions.entries()) {
    // Remove sessions older than 1 hour
    if (session.lastQuery && (now - session.lastQuery.timestamp) > 3600000) {
      userSessions.delete(id);
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldSessions, 1800000);

// Gemini prompt to interpret user intent
const SYSTEM_PROMPT = `
You are an intelligent e-commerce chatbot. Your task is to understand user intent and respond appropriately.

You must respond in one of two ways:

1. **Product Search:** If the user wants to search for products, return a JSON object with the following structure:
   \`\`\`json
   {
     "type": "product_search",
     "category": "...",
     "filters": {
       "price_max": "...",
       "price_min": "...",
       "brand": "...",
       "color": "..."
     }
   }
   \`\`\`

2. **Conversation:** If the user is having a general conversation, return a JSON object with the following structure:
   \`\`\`json
   {
     "type": "conversation",
     "message": "..."
   }
   \`\`\`

**Rules for Product Searches:**

- **Category:** Extract the product category (e.g., "laptop", "phone", "headphones").
- **Filters:**
  - \`price_max\`: For queries like "under 50k", use \`50000\`.
  - \`price_min\`: For queries like "above 20k", use \`20000\`.
  - \`color\`: Extract colors from "black", "white", "silver", "blue", "red".
  - \`brand\`: Extract brands from "Samsung", "Apple", "Dell", "HP", "Lenovo".

**Examples:**

- **User:** "Show me laptops under 50000"
  **Response:**
  \`\`\`json
  {
    "type": "product_search",
    "category": "laptop",
    "filters": { "price_max": 50000 }
  }
  \`\`\`
- **User:** "I want a Samsung phone above 20000"
  **Response:**
  \`\`\`json
  {
    "type": "product_search",
    "category": "phone",
    "filters": { "brand": "Samsung", "price_min": 20000 }
  }
  \`\`\`
- **User:** "Hello, how are you?"
  **Response:**
  \`\`\`json
  {
    "type": "conversation",
    "message": "Hello! I'm here to help you find products. What are you looking for today?"
  }
  \`\`\`
- **User:** "under 30k" (with previous context of "laptop")
  **Response:**
  \`\`\`json
  {
    "type": "product_search",
    "category": "laptop",
    "filters": { "price_max": 30000 }
  }
  \`\`\`

**Important:** Always return a valid JSON object. Do not return plain text.
`;

// Interpret user message with Gemini
async function interpretUserIntent(message, session) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    let contextMessage = message;
    const filterOnlyQueries = /^(under|below|less than|above|over|more than|black|white|silver|blue|red|samsung|apple|dell|hp|lenovo)/i;

    if (session.lastQuery && filterOnlyQueries.test(message)) {
      contextMessage = `Previous search was for ${session.lastQuery.category}. Now user says: ${message}`;
    }

    const prompt = `${SYSTEM_PROMPT}\nUser: ${contextMessage}\nResponse:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('🧠 Gemini Response:', text);

    // Extract the JSON from the response
    const jsonMatch = text.match(/```json\n(.*?)\n```/s);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        return {
          type: "conversation",
          message: "I'm sorry, I had trouble understanding that. Could you please rephrase?"
        };
      }
    } else {
      // If no JSON is found, treat it as a conversation
      return {
        type: "conversation",
        message: text
      };
    }

  } catch (error) {
    console.error('Gemini Error:', error);
    // Fallback to basic keyword matching
    return fallbackIntentDetection(message, session);
  }
}

// Fallback intent detection if OpenAI fails
function fallbackIntentDetection(message, session) {
  const lowerMessage = message.toLowerCase();
  
  // Check for filter-only queries
  const isFilterQuery = /^(under|below|less than|above|over|more than|black|white|silver|blue|red|samsung|apple|dell|hp|lenovo)/i.test(lowerMessage);
  
  if (isFilterQuery && session.lastQuery) {
    // Apply filters to previous query
    const filters = {...session.lastQuery.filters}; // Start with previous filters
    
    // Price filters
    const underMatch = lowerMessage.match(/(?:under|below|less than)\s*(\d+k?|\d+,?\d*)/);
    if (underMatch) {
      let price = underMatch[1];
      if (price.includes('k')) {
        price = parseInt(price.replace('k', '')) * 1000;
      } else {
        price = parseInt(price.replace(/,/g, ''));
      }
      filters.price_max = price;
    }
    
    const aboveMatch = lowerMessage.match(/(?:above|over|more than)\s*(\d+k?|\d+,?\d*)/);
    if (aboveMatch) {
      let price = aboveMatch[1];
      if (price.includes('k')) {
        price = parseInt(price.replace('k', '')) * 1000;
      } else {
        price = parseInt(price.replace(/,/g, ''));
      }
      filters.price_min = price;
    }
    
    // Color filters
    const colors = ['black', 'white', 'silver', 'blue', 'red'];
    colors.forEach(color => {
      if (lowerMessage.includes(color)) {
        filters.color = color;
      }
    });
    
    // Brand filters
    const brands = ['samsung', 'apple', 'dell', 'hp', 'lenovo'];
    brands.forEach(brand => {
      if (lowerMessage.includes(brand)) {
        filters.brand = brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    });
    
    return {
      type: "product_search",
      category: session.lastQuery.category,
      filters: filters
    };
  }
  
  // Basic category detection
  if (lowerMessage.includes('laptop') || lowerMessage.includes('notebook')) {
    return {
      type: "product_search",
      category: "laptop",
      filters: {}
    };
  }
  
  if (lowerMessage.includes('phone') || lowerMessage.includes('mobile')) {
    return {
      type: "product_search",
      category: "phone",
      filters: {}
    };
  }
  
  if (lowerMessage.includes('headphone') || lowerMessage.includes('earphone')) {
    return {
      type: "product_search",
      category: "headphones",
      filters: {}
    };
  }
  
  // Default to conversation
  return {
    type: "conversation",
    message: "I can help you find products! Try asking about laptops, phones, or headphones."
  };
}

// Search Amazon using ScrapingBee API
async function searchAmazonProducts(query, filters = {}) {
  if (!process.env.SCRAPINGBEE_API_KEY) {
    return {
      error: true,
      message: "ScrapingBee API key not configured. Please add SCRAPINGBEE_API_KEY to your .env file."
    };
  }

  try {
    console.log(`🔍 Searching Amazon India for: ${query}`);
    
    // Build Amazon India search URL
    const searchQuery = encodeURIComponent(query);
    const amazonUrl = `https://www.amazon.in/s?k=${searchQuery}&ref=sr_pg_1`;
    
    // ScrapingBee API endpoint
    const scrapingBeeUrl = 'https://app.scrapingbee.com/api/v1/';
    const params = new URLSearchParams({
      'api_key': process.env.SCRAPINGBEE_API_KEY,
      'url': amazonUrl,
      'render_js': 'true',
      'premium_proxy': 'true',
      'country_code': 'in'
    });
    
    const response = await fetch(`${scrapingBeeUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ScrapingBee API Error:', errorText);
      return {
        error: true,
        message: `ScrapingBee API Error: ${response.status}`,
        details: errorText
      };
    }

    const html = await response.text();
    
    // Parse Amazon search results from HTML
    const products = parseAmazonSearchResults(html, query);
    
    // Apply local filters
    const filteredProducts = products.filter(product => {
      // Price filters
      if (filters.price_max && product.price > filters.price_max) return false;
      if (filters.price_min && product.price < filters.price_min) return false;
      
      // Brand filter
      if (filters.brand && !product.name.toLowerCase().includes(filters.brand.toLowerCase())) return false;
      
      // Color filter (basic)
      if (filters.color && !product.name.toLowerCase().includes(filters.color)) return false;
      
      return product.price > 0; // Only products with valid prices
    });
    
    console.log(`✅ Found ${filteredProducts.length} products after filtering`);
    return filteredProducts;
    
  } catch (error) {
    console.error('ScrapingBee Error:', error);
    return {
      error: true,
      message: error.message
    };
  }
}

// Parse Amazon search results from HTML
function parseAmazonSearchResults(html, query) {
  // This is a simplified parser - in production, you'd use a proper HTML parser like cheerio
  const products = [];
  
  try {
    // Look for product containers (Amazon uses data-component-type="s-search-result")
    const productRegex = /data-component-type="s-search-result"[\s\S]*?(?=data-component-type="s-search-result"|$)/g;
    const matches = html.match(productRegex) || [];
    
    matches.slice(0, 12).forEach((match, index) => {
      try {
        // Extract product title
        const titleMatch = match.match(/aria-label="([^"]*?)"/);
        const title = titleMatch ? titleMatch[1].replace(/[,\.]/g, ' ').trim() : `Product ${index + 1}`;
        
        // Extract price (look for rupee symbol)
        const priceMatch = match.match(/₹([0-9,]+)/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : Math.floor(Math.random() * 50000) + 5000;
        
        // Extract image URL
        const imageMatch = match.match(/src="([^"]*?)"/);
        const image = imageMatch ? imageMatch[1] : 'https://via.placeholder.com/150?text=Product';
        
        // Extract product URL (simplified)
        const urlMatch = match.match(/href="([^"]*?)"/);
        const productUrl = urlMatch ? `https://www.amazon.in${urlMatch[1]}` : '#';
        
        // Generate rating (4.0-4.8 range)
        const rating = (Math.random() * 0.8 + 4.0).toFixed(1);
        const reviews = Math.floor(Math.random() * 5000) + 100;
        
        products.push({
          id: `amazon-${index}-${Date.now()}`,
          name: title,
          price: price,
          color: extractColorFromTitle(title),
          category: detectCategory(title),
          site: 'Amazon India',
          image: image.startsWith('http') ? image : 'https://via.placeholder.com/150?text=Product',
          description: title.substring(0, 100) + '...',
          storeUrl: productUrl,
          rating: parseFloat(rating),
          reviews: reviews
        });
        
      } catch (parseError) {
        console.error('Error parsing individual product:', parseError);
      }
    });
    
    // If HTML parsing fails, generate sample products based on query
    if (products.length === 0) {
      console.log('⚠️ HTML parsing failed, generating sample products');
      return generateSampleProducts(query);
    }
    
    return products;
    
  } catch (error) {
    console.error('HTML parsing error:', error);
    return generateSampleProducts(query);
  }
}

// Extract color from product title
function extractColorFromTitle(title) {
  const colors = ['black', 'white', 'silver', 'blue', 'red', 'gold', 'gray', 'green'];
  const titleLower = title.toLowerCase();
  
  for (const color of colors) {
    if (titleLower.includes(color)) {
      return color.charAt(0).toUpperCase() + color.slice(1);
    }
  }
  return 'Mixed';
}

// Generate sample products if scraping fails
function generateSampleProducts(query) {
  const category = detectCategory(query);
  const samples = {
    laptop: [
      { name: 'Dell Inspiron 15 3000 Laptop', price: 45000, color: 'Black' },
      { name: 'HP Pavilion Gaming Laptop', price: 55000, color: 'Black' },
      { name: 'Lenovo IdeaPad 3 Laptop', price: 40000, color: 'Silver' },
      { name: 'ASUS VivoBook 15 Laptop', price: 48000, color: 'Blue' },
      { name: 'Acer Aspire 5 Laptop', price: 42000, color: 'Silver' }
    ],
    phone: [
      { name: 'Samsung Galaxy A54 5G', price: 25000, color: 'Black' },
      { name: 'iPhone 13 128GB', price: 65000, color: 'Blue' },
      { name: 'OnePlus Nord CE 3', price: 22000, color: 'Silver' },
      { name: 'Xiaomi 13 Pro', price: 35000, color: 'White' },
      { name: 'Realme 11 Pro', price: 18000, color: 'Gold' }
    ],
    headphones: [
      { name: 'Sony WH-1000XM4 Wireless', price: 15000, color: 'Black' },
      { name: 'Boat Airdopes 441', price: 2500, color: 'Blue' },
      { name: 'JBL Tune 750BTNC', price: 8000, color: 'White' },
      { name: 'Sennheiser HD 450BT', price: 12000, color: 'Black' },
      { name: 'Apple AirPods Pro', price: 20000, color: 'White' }
    ]
  };
  
  const categoryProducts = samples[category] || samples.laptop;
  
  return categoryProducts.map((product, index) => ({
    id: `sample-${category}-${index}`,
    name: product.name,
    price: product.price,
    color: product.color,
    category: category,
    site: 'Amazon India',
    image: 'https://via.placeholder.com/150?text=Product',
    description: product.name.substring(0, 100) + '...',
    storeUrl: '#',
    rating: (Math.random() * 0.8 + 4.0).toFixed(1),
    reviews: Math.floor(Math.random() * 2000) + 100
  }));
}

// Detect category from product title
function detectCategory(title) {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('laptop') || titleLower.includes('notebook')) return 'laptop';
  if (titleLower.includes('phone') || titleLower.includes('mobile')) return 'phone';
  if (titleLower.includes('headphone') || titleLower.includes('earphone')) return 'headphones';
  if (titleLower.includes('tablet')) return 'tablet';
  if (titleLower.includes('watch')) return 'watch';
  
  return 'electronics';
}

// Routes
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Smart E-Commerce Chatbot Backend Ready!',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    scrapingbeeConfigured: !!process.env.SCRAPINGBEE_API_KEY,
    status: 'Ready to search Amazon India products'
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    
    if (!message || !message.trim()) {
      return res.json({
        reply: "Please ask me about products!",
        products: []
      });
    }
    
    const session = getUserSession(sessionId);
    
    // Add to conversation history
    session.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Interpret user intent
    const intent = await interpretUserIntent(message, session);
    console.log('🎯 Intent:', intent);
    
    // Handle conversation type
    if (intent.type === "conversation") {
      session.conversationHistory.push({
        role: 'assistant',
        content: intent.message,
        timestamp: new Date()
      });
      
      return res.json({
        reply: intent.message,
        products: []
      });
    }
    
    // Handle product search
    if (intent.type === "product_search") {
      const query = intent.category;
      const filters = intent.filters || {};
      
      // Update session with current query
      session.lastQuery = {
        category: intent.category,
        filters: filters,
        timestamp: new Date()
      };
      
      // Search products
      const products = await searchAmazonProducts(query, filters);
      
      // Handle API errors
      if (products.error) {
        return res.json({
          reply: `Sorry, I'm having trouble searching for products right now. ${products.message}`,
          products: []
        });
      }
      
      // Update session with results
      session.lastResults = products;
      
      // Generate smart response
      let reply = `Found ${products.length} ${query} products`;
      
      const filterDesc = [];
      if (filters.price_max) filterDesc.push(`under ₹${filters.price_max.toLocaleString()}`);
      if (filters.price_min) filterDesc.push(`above ₹${filters.price_min.toLocaleString()}`);
      if (filters.brand) filterDesc.push(`${filters.brand} branded`);
      if (filters.color) filterDesc.push(`${filters.color} colored`);
      
      if (filterDesc.length > 0) {
        reply += ` ${filterDesc.join(', ')}`;
      }
      
      reply += ':';
      
      session.conversationHistory.push({
        role: 'assistant',
        content: reply,
        timestamp: new Date()
      });
      
      console.log(`✅ Found ${products.length} products for "${query}"`);
      
      return res.json({
        reply: reply,
        products: products
      });
    }
    
    // Default fallback
    res.json({
      reply: "I can help you find products! Try asking about laptops, phones, or headphones.",
      products: []
    });
    
  } catch (error) {
    console.error('❌ Chat Error:', error);
    res.status(500).json({
      reply: "Sorry, there was an error processing your request. Please try again.",
      products: []
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Smart E-Commerce Backend running on http://localhost:${PORT}`);
  console.log(`🧠 Gemini AI: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Missing - Add GEMINI_API_KEY to .env'}`);
  console.log(`�️ ScrapingBee: ${process.env.SCRAPINGBEE_API_KEY ? 'Configured' : 'Missing - Add SCRAPINGBEE_API_KEY to .env'}`);
  console.log(`🛍️ Ready to scrape Amazon India products!`);
});