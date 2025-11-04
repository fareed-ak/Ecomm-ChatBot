// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = 5000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

// OpenAI prompt to interpret user intent
const SYSTEM_PROMPT = `
You are an intelligent e-commerce chatbot. Your task is to understand user intent and respond appropriately.

Rules:
1. If user wants to search for products, return JSON with type "product_search"
2. If user is having a conversation, return type "conversation"
3. For product searches, extract:
   - category (laptop, phone, headphones, etc.)
   - filters (price_max, price_min, brand, color)
4. For "under 50k" type queries, use price_max: 50000
5. For "above 20k" type queries, use price_min: 20000

Examples:
User: "Show me laptops under 50000"
Response: {"type": "product_search", "category": "laptop", "filters": {"price_max": 50000}}

User: "I want a Samsung phone above 20000"
Response: {"type": "product_search", "category": "phone", "filters": {"brand": "Samsung", "price_min": 20000}}

User: "Hello, how are you?"
Response: {"type": "conversation", "message": "Hello! I'm here to help you find products. What are you looking for today?"}

User: "under 30k" (when there's previous context)
Response: {"type": "product_search", "category": "laptop", "filters": {"price_max": 30000}}

Always return valid JSON. Never return plain text for product searches.
`;

// Interpret user message with OpenAI
async function interpretUserIntent(message, session) {
  try {
    // Add context from session if available
    let contextMessage = message;
    if (session.lastQuery && /^(under|below|above|over|less than|more than|black|white|silver|blue|red|samsung|apple|dell|hp|lenovo)/i.test(message)) {
      contextMessage = `Previous search was for ${session.lastQuery.category}. Now user says: ${message}`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: contextMessage }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const response = completion.choices[0].message.content.trim();
    console.log('🧠 OpenAI Response:', response);
    
    // Try to parse as JSON
    try {
      return JSON.parse(response);
    } catch (parseError) {
      // If not valid JSON, treat as conversation
      return {
        type: "conversation",
        message: response
      };
    }
    
  } catch (error) {
    console.error('OpenAI Error:', error);
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
    const filters = {};
    
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
        filters.brand = brand;
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

// Search Amazon API
async function searchAmazonProducts(query, filters = {}) {
  if (!process.env.RAPIDAPI_KEY) {
    return {
      error: true,
      message: "RapidAPI key not configured"
    };
  }

  try {
    console.log(`🔍 Searching Amazon for: ${query}`);
    
    const baseUrl = `https://${process.env.RAPIDAPI_HOST}/search`;
    const searchParams = new URLSearchParams({
      query: query,
      country: 'IN',
      page: '1',
      sort_by: 'RELEVANCE'
    });
    
    const url = `${baseUrl}?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Amazon API Error:', errorText);
      return {
        error: true,
        message: `API Error: ${response.status}`,
        details: errorText
      };
    }

    const data = await response.json();
    
    if (!data.data || !data.data.products) {
      return [];
    }
    
    // Transform and filter products
    let products = data.data.products.slice(0, 12).map((product, index) => ({
      id: product.asin || `prod-${index}`,
      name: product.title || 'Product',
      price: product.price?.raw ? Math.round(parseFloat(product.price.raw.replace(/[^\d.]/g, ''))) : 0,
      color: 'Mixed',
      category: detectCategory(product.title || ''),
      site: 'Amazon India',
      image: product.thumbnail || 'https://via.placeholder.com/150?text=Product',
      description: (product.title || '').substring(0, 100) + '...',
      storeUrl: product.url || '#',
      rating: product.reviews?.rating || 4.0,
      reviews: product.reviews?.count || 0
    }));
    
    // Apply local filters
    products = products.filter(product => {
      // Price filters
      if (filters.price_max && product.price > filters.price_max) return false;
      if (filters.price_min && product.price < filters.price_min) return false;
      
      // Brand filter
      if (filters.brand && !product.name.toLowerCase().includes(filters.brand.toLowerCase())) return false;
      
      // Color filter (basic)
      if (filters.color && !product.name.toLowerCase().includes(filters.color)) return false;
      
      return product.price > 0; // Only products with valid prices
    });
    
    return products;
    
  } catch (error) {
    console.error('Amazon API Error:', error);
    return {
      error: true,
      message: error.message
    };
  }
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
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    rapidapiConfigured: !!process.env.RAPIDAPI_KEY
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
  console.log(`🧠 OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🛍️ RapidAPI: ${process.env.RAPIDAPI_KEY ? 'Configured' : 'Missing'}`);
});