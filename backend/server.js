// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Load local products data as fallback
let localProducts = [];
try {
  const productsData = fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8');
  localProducts = JSON.parse(productsData);
  console.log(`📦 Loaded ${localProducts.length} local products as fallback`);
} catch (error) {
  console.error('Error loading local products:', error);
}

// Cache for API products
let apiProductsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch products from Fake Store API with proper categories
async function fetchProductsFromAPI() {
  try {
    console.log('🌐 Fetching products from Fake Store API...');
    
    const response = await fetch('https://fakestoreapi.com/products');
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const apiProducts = await response.json();
    
    // Transform API products to our format
    const transformedProducts = apiProducts.map(product => {
      // Map categories properly
      let category = 'electronics';
      if (product.category.includes('clothing')) {
        category = 'clothing';
      } else if (product.category === 'jewelery') {
        category = 'jewelry';
      }
      
      return {
        id: product.id + 1000,
        name: product.title,
        price: Math.round(product.price * 80), // Convert USD to INR
        color: 'mixed',
        category: category,
        site: 'Online Store',
        image: product.image,
        description: product.description.substring(0, 100) + '...',
        rating: product.rating?.rate || 4.0,
        storeUrl: `https://fakestoreapi.com/products/${product.id}`
      };
    });
    
    console.log(`✅ Successfully fetched ${transformedProducts.length} products from API`);
    return transformedProducts;
    
  } catch (error) {
    console.error('❌ Error fetching from API:', error.message);
    return localProducts;
  }
}

// Get products with caching
async function getProducts() {
  const now = Date.now();
  
  if (apiProductsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📋 Using cached products');
    return apiProductsCache;
  }
  
  const products = await fetchProductsFromAPI();
  apiProductsCache = products;
  cacheTimestamp = now;
  
  return products;
}

// Enhanced search function that works with "laptop"
async function searchProducts(query) {
  const products = await getProducts();
  const searchTerm = query.toLowerCase();
  
  // Keywords mapping for better search
  const categoryKeywords = {
    'laptop': ['laptop', 'notebook', 'computer'],
    'phone': ['phone', 'mobile', 'smartphone', 'iphone', 'android'],
    'headphones': ['headphones', 'headphone', 'earphones', 'earbuds', 'airpods', 'audio'],
    'electronics': ['electronics', 'electronic', 'gadget', 'gadgets', 'tech'],
    'clothing': ['clothes', 'clothing', 'shirt', 'dress', 'jacket', 't-shirt'],
    'jewelry': ['jewelry', 'jewellery', 'ring', 'necklace', 'earring', 'bracelet']
  };
  
  // Find matching category
  let targetCategory = null;
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => searchTerm.includes(keyword))) {
      targetCategory = category;
      break;
    }
  }
  
  // If no category found, search in all product fields
  let results = products.filter(product => {
    const productName = product.name.toLowerCase();
    const productDesc = product.description ? product.description.toLowerCase() : '';
    const productCategory = product.category.toLowerCase();
    
    // If specific category found, filter by that
    if (targetCategory) {
      return productCategory === targetCategory;
    }
    
    // Otherwise, search in all fields
    return (
      productName.includes(searchTerm) ||
      productDesc.includes(searchTerm) ||
      productCategory.includes(searchTerm)
    );
  });
  
  return results;
}

// Generate smart response
function generateBotResponse(query, foundProducts) {
  if (foundProducts.length === 0) {
    return `Sorry, I couldn't find any products matching "${query}". Try searching for: laptops, phones, headphones, clothing, or jewelry!`;
  }
  
  if (foundProducts.length === 1) {
    return `Perfect! I found exactly what you're looking for:`;
  }
  
  return `Great! I found ${foundProducts.length} products matching "${query}":`;
}

// Routes
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'E-Commerce Chatbot Backend - Online Products Only!',
    timestamp: new Date().toISOString(),
    apiStatus: 'Ready'
  });
});

// Chat route - simplified and fixed
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.json({
        reply: "Please ask me something! I can help you find laptops, phones, headphones, and more. 😊",
        products: []
      });
    }

    // Search products
    const foundProducts = await searchProducts(message);
    const botReply = generateBotResponse(message, foundProducts);

    console.log(`🔍 Search: "${message}" | Found: ${foundProducts.length} products`);

    res.json({
      reply: botReply,
      products: foundProducts
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      reply: "Sorry, I encountered an error. Please try again.",
      products: []
    });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (error) {
    console.error('Error getting products:', error);
    res.json([]);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`🛍️ Focused on online products with store links!`);
});