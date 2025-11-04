// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Load local products as fallback
let localProducts = [];
try {
  const productsData = fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8');
  localProducts = JSON.parse(productsData);
} catch (error) {
  console.error('Error loading local products:', error);
}

// User sessions with memory
const userSessions = new Map();

function getUserSession(sessionId = 'default') {
  if (!userSessions.has(sessionId)) {
    userSessions.set(sessionId, {
      lastQuery: '',
      lastResults: [],
      lastCategory: '',
      conversationHistory: []
    });
  }
  return userSessions.get(sessionId);
}

// Amazon API search function
async function searchAmazonProducts(query) {
  if (!process.env.RAPIDAPI_KEY) {
    console.log('No RapidAPI key found, using local products');
    return localProducts.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  try {
    console.log(`🔍 Searching Amazon for: ${query}`);
    
    const url = `https://amazon-price1.p.rapidapi.com/search?keywords=${encodeURIComponent(query)}&marketplace=IN`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST || 'amazon-price1.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const apiProducts = await response.json();
    
    // Transform API response to our format
    const transformedProducts = apiProducts.slice(0, 10).map((product, index) => ({
      id: product.asin || `api-${index}`,
      name: product.title || 'Product',
      price: product.price?.raw ? Math.round(parseFloat(product.price.raw.replace(/[^\d.]/g, ''))) : 0,
      color: 'Mixed',
      category: detectCategory(product.title || ''),
      site: 'Amazon India',
      image: product.thumbnail || 'https://via.placeholder.com/150',
      description: (product.title || '').substring(0, 100) + '...',
      storeUrl: product.url || '#',
      asin: product.asin
    }));

    return transformedProducts;
    
  } catch (error) {
    console.error('Amazon API error:', error.message);
    // Fallback to local search
    return localProducts.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase())
    );
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

// Extract filters from message
function extractFilters(message, session) {
  const filters = {};
  const lowerMessage = message.toLowerCase();
  
  // Price filters
  const priceMatch = lowerMessage.match(/(?:under|below|less than|max(?:imum)?|cheaper than)\s*₹?(\d+(?:,\d+)?k?)|(?:above|over|more than|min(?:imum)?)\s*₹?(\d+(?:,\d+)?k?)/i);
  if (priceMatch) {
    let priceStr = priceMatch[1] || priceMatch[2];
    if (priceStr) {
      // Handle "30k" format
      if (priceStr.endsWith('k')) {
        priceStr = priceStr.replace('k', '000');
      }
      priceStr = priceStr.replace(/,/g, ''); // Remove commas
      const price = parseInt(priceStr);
      if (priceMatch[1]) { // under/below
        filters.maxPrice = price;
      } else { // above/over
        filters.minPrice = price;
      }
    }
  }
  
  // Color filters
  const colors = ['black', 'white', 'silver', 'blue', 'red', 'gold', 'gray', 'green'];
  colors.forEach(color => {
    if (lowerMessage.includes(color)) {
      filters.color = color;
    }
  });
  
  // Brand filters (common ones)
  const brands = ['apple', 'samsung', 'dell', 'hp', 'lenovo', 'sony', 'boat', 'realme', 'xiaomi', 'oneplus'];
  brands.forEach(brand => {
    if (lowerMessage.includes(brand)) {
      filters.brand = brand;
    }
  });
  
  return filters;
}

// Apply filters to products
function applyFilters(products, filters) {
  return products.filter(product => {
    // Price filters
    if (filters.maxPrice && product.price > filters.maxPrice) return false;
    if (filters.minPrice && product.price < filters.minPrice) return false;
    
    // Color filter
    if (filters.color && !product.color.toLowerCase().includes(filters.color)) return false;
    
    // Brand filter
    if (filters.brand && !product.name.toLowerCase().includes(filters.brand)) return false;
    
    return true;
  });
}

// Enhanced search with memory
async function enhancedSearch(message, session) {
  const lowerMessage = message.toLowerCase();
  
  // Check if this is a filter-only query (like "under 30000")
  const isFilterQuery = /^(under|below|less than|above|over|more than|max|min|black|white|silver|blue|red|gold|apple|samsung|dell|hp|lenovo|sony|boat|realme|xiaomi|oneplus)/i.test(lowerMessage);
  
  let searchQuery = message;
  let products = [];
  
  // If it's a filter query and we have previous results, apply filters to last results
  if (isFilterQuery && session.lastResults.length > 0) {
    console.log('🔧 Applying filters to previous results');
    products = [...session.lastResults];
    searchQuery = session.lastQuery; // Use previous query for context
  } else {
    // Regular search
    console.log('🔍 Performing new search');
    products = await searchAmazonProducts(message);
  }
  
  // Extract and apply filters
  const filters = extractFilters(message, session);
  const filteredProducts = applyFilters(products, filters);
  
  // Update session
  session.lastQuery = searchQuery;
  session.lastResults = filteredProducts;
  
  return {
    products: filteredProducts,
    filters: filters,
    originalQuery: message
  };
}

// Generate smart response
function generateResponse(message, results) {
  const { products, filters } = results;
  
  if (products.length === 0) {
    return `Sorry, I couldn't find products matching "${message}". Try searching for laptops, phones, or headphones!`;
  }
  
  let response = `Found ${products.length} products`;
  
  // Add filter context
  const filterDesc = [];
  if (filters.maxPrice) filterDesc.push(`under ₹${filters.maxPrice.toLocaleString()}`);
  if (filters.minPrice) filterDesc.push(`above ₹${filters.minPrice.toLocaleString()}`);
  if (filters.color) filterDesc.push(`${filters.color} colored`);
  if (filters.brand) filterDesc.push(`${filters.brand} branded`);
  
  if (filterDesc.length > 0) {
    response += ` ${filterDesc.join(', ')}`;
  }
  
  response += ':';
  
  return response;
}

// Routes
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'E-Commerce Chatbot Backend Ready!',
    hasApiKey: !!process.env.RAPIDAPI_KEY,
    localProducts: localProducts.length
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
    
    // Handle special commands
    if (message.toLowerCase().includes('clear') || message.toLowerCase().includes('reset')) {
      session.lastQuery = '';
      session.lastResults = [];
      return res.json({
        reply: "I've cleared your search history. What would you like to search for?",
        products: []
      });
    }
    
    // Enhanced search with memory
    const searchResults = await enhancedSearch(message, session);
    const botReply = generateResponse(message, searchResults);
    
    console.log(`🤖 Query: "${message}" | Found: ${searchResults.products.length} products | Filters:`, searchResults.filters);
    
    res.json({
      reply: botReply,
      products: searchResults.products
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      reply: "Sorry, there was an error. Please try again.",
      products: []
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`🔑 RapidAPI Key: ${process.env.RAPIDAPI_KEY ? 'Configured' : 'Missing'}`);
});