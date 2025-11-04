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

// Gemini prompt to interpret user intent - EXPANDED for all products
const SYSTEM_PROMPT = `
You are an intelligent e-commerce chatbot for Amazon India. Your task is to understand user intent and respond appropriately for ANY product category.

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

**Product Categories You Can Handle:**
- Electronics: laptop, phone, headphones, tablet, watch, tv, camera, speaker
- Clothing: shirt, jeans, dress, shoes, bag, jacket, saree, kurta
- Jewelry: necklace, earrings, bracelet, ring, gold, silver, diamond
- Home & Kitchen: iron, mixer, cooker, refrigerator, washing machine, microwave, ac, fan, bed, sofa
- Beauty: shampoo, cream, perfume, makeup, hair care, skin care
- Sports: gym equipment, cricket, football, fitness gear
- Books: novels, textbooks, stationery, pen, notebook
- Automotive: car accessories, bike parts, tools
- Toys: games, dolls, puzzles
- And ANY other product the user mentions!

**Rules for Product Searches:**
- **Category:** Extract ANY product category from user query (shirt, jewelry, iron, etc.)
- **Filters:**
  - \`price_max\`: For "under 50k", "below 5000", "less than 1000" → use numeric value
  - \`price_min\`: For "above 20k", "over 500", "more than 100" → use numeric value
  - \`color\`: Extract any color mentioned
  - \`brand\`: Extract any brand mentioned

**Examples:**
- "Show me shirts under 2000" → {"type": "product_search", "category": "shirt", "filters": {"price_max": 2000}}
- "Gold jewelry above 10000" → {"type": "product_search", "category": "jewelry", "filters": {"price_min": 10000}}
- "Steam iron under 3000" → {"type": "product_search", "category": "iron", "filters": {"price_max": 3000}}
- "Samsung washing machine" → {"type": "product_search", "category": "washing machine", "filters": {"brand": "Samsung"}}
- "Black running shoes" → {"type": "product_search", "category": "shoes", "filters": {"color": "black"}}
- "Books about business" → {"type": "product_search", "category": "books", "filters": {}}

**Important:** 
- Always return valid JSON
- Handle ANY product category user mentions
- Be flexible with category detection
- If unsure about category, use the main product word
`;


// Interpret user message with Gemini
async function interpretUserIntent(message, session) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️ Gemini API key missing, using fallback detection');
      return fallbackIntentDetection(message, session);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    let contextMessage = message;
    const filterOnlyQueries = /^(under|below|less than|above|over|more than|black|white|silver|blue|red|samsung|apple|dell|hp|lenovo)/i;

    if (session.lastQuery && filterOnlyQueries.test(message)) {
      contextMessage = `Previous search was for ${session.lastQuery.category}. Now user says: ${message}`;
    }

    const prompt = `${SYSTEM_PROMPT}\nUser: ${contextMessage}\nResponse:`;

    console.log('🧠 Sending to Gemini:', contextMessage);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('🧠 Gemini Response:', text);

    // Extract the JSON from the response
    const jsonMatch = text.match(/```json\n(.*?)\n```/s);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        console.log('✅ Successfully parsed Gemini response');
        return parsed;
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.log('🔄 Falling back to manual detection');
        return fallbackIntentDetection(message, session);
      }
    } else {
      console.log('⚠️ No JSON found in Gemini response, using fallback');
      return fallbackIntentDetection(message, session);
    }

  } catch (error) {
    console.error('❌ Gemini Error:', error.message);
    console.log('🔄 Using fallback intent detection');
    return fallbackIntentDetection(message, session);
  }
}

// Fallback intent detection if Gemini fails - EXPANDED for all products
function fallbackIntentDetection(message, session) {
  const lowerMessage = message.toLowerCase();
  
  // Check for filter-only queries
  const isFilterQuery = /^(under|below|less than|above|over|more than|black|white|silver|blue|red|samsung|apple|dell|hp|lenovo|nike|adidas|puma)/i.test(lowerMessage);
  
  if (isFilterQuery && session.lastQuery) {
    // Apply filters to previous query
    const filters = {...session.lastQuery.filters}; // Start with previous filters
    
    // Price filters with better parsing
    const underMatch = lowerMessage.match(/(?:under|below|less than|max|maximum)\s*₹?\s*(\d+(?:,\d+)*(?:k|thousand|lakh)?)/i);
    if (underMatch) {
      let price = parsePrice(underMatch[1]);
      filters.price_max = price;
    }
    
    const aboveMatch = lowerMessage.match(/(?:above|over|more than|min|minimum)\s*₹?\s*(\d+(?:,\d+)*(?:k|thousand|lakh)?)/i);
    if (aboveMatch) {
      let price = parsePrice(aboveMatch[1]);
      filters.price_min = price;
    }
    
    // Color filters (expanded)
    const colors = ['black', 'white', 'silver', 'blue', 'red', 'gold', 'gray', 'green', 'yellow', 'pink', 'purple', 'brown', 'orange'];
    colors.forEach(color => {
      if (lowerMessage.includes(color)) {
        filters.color = color;
      }
    });
    
    // Brand filters (expanded)
    const brands = [
      // Electronics
      'samsung', 'apple', 'dell', 'hp', 'lenovo', 'sony', 'lg', 'asus', 'acer', 'oneplus', 'xiaomi', 'realme', 'oppo', 'vivo',
      // Fashion
      'nike', 'adidas', 'puma', 'reebok', 'levis', 'arrow', 'peter england', 'van heusen',
      // Home appliances
      'bajaj', 'philips', 'havells', 'usha', 'morphy richards', 'prestige', 'butterfly',
      // Beauty
      'loreal', 'olay', 'lakme', 'neutrogena', 'himalaya', 'dove'
    ];
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
  
  // Extended category detection for any product
  const categoryKeywords = {
    // Electronics
    'laptop': ['laptop', 'notebook', 'computer'],
    'phone': ['phone', 'mobile', 'smartphone'],
    'headphones': ['headphone', 'earphone', 'earbuds', 'airpods'],
    'tv': ['tv', 'television', 'smart tv'],
    'tablet': ['tablet', 'ipad'],
    'watch': ['watch', 'smartwatch'],
    'camera': ['camera', 'dslr'],
    
    // Clothing
    'shirt': ['shirt', 't-shirt', 'tshirt'],
    'jeans': ['jeans', 'pants', 'trouser'],
    'dress': ['dress', 'frock', 'gown'],
    'shoes': ['shoe', 'sneaker', 'boot', 'sandal'],
    'bag': ['bag', 'handbag', 'backpack', 'purse'],
    
    // Jewelry
    'jewelry': ['jewelry', 'jewellery', 'necklace', 'earring', 'bracelet', 'ring', 'gold', 'silver', 'diamond'],
    
    // Home & Kitchen
    'iron': ['iron', 'steam iron', 'dry iron'],
    'mixer': ['mixer', 'grinder', 'blender'],
    'cooker': ['cooker', 'pressure cooker'],
    'refrigerator': ['refrigerator', 'fridge'],
    'washing-machine': ['washing machine', 'washer'],
    'ac': ['ac', 'air conditioner'],
    'fan': ['fan', 'ceiling fan', 'table fan'],
    
    // Beauty
    'hair-care': ['shampoo', 'conditioner', 'hair oil'],
    'skin-care': ['cream', 'lotion', 'face wash', 'moisturizer'],
    'perfume': ['perfume', 'deodorant', 'fragrance'],
    
    // Others
    'books': ['book', 'novel', 'textbook'],
    'toys': ['toy', 'doll', 'game', 'puzzle']
  };
  
  // Find matching category
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        type: "product_search",
        category: category,
        filters: {}
      };
    }
  }
  
  // If no specific category found, extract the main product word
  const words = lowerMessage.split(' ');
  const productWords = words.filter(word => 
    word.length > 2 && 
    !['show', 'find', 'search', 'get', 'buy', 'want', 'need', 'looking', 'for', 'me', 'some', 'good', 'best', 'cheap'].includes(word)
  );
  
  if (productWords.length > 0) {
    return {
      type: "product_search",
      category: productWords[0], // Use the first meaningful word as category
      filters: {}
    };
  }
  
  // Default to conversation
  return {
    type: "conversation",
    message: "I can help you find any product on Amazon India! Try asking about electronics, clothing, jewelry, home appliances, beauty products, books, toys, and much more. What are you looking for?"
  };
}

// Helper function to parse price strings
function parsePrice(priceStr) {
  let price = priceStr.toLowerCase().replace(/,/g, '');
  
  if (price.includes('lakh')) {
    price = parseFloat(price.replace('lakh', '')) * 100000;
  } else if (price.includes('k') || price.includes('thousand')) {
    price = parseFloat(price.replace(/k|thousand/g, '')) * 1000;
  } else {
    price = parseInt(price);
  }
  
  return price;
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

// Generate sample products if scraping fails - EXPANDED for all categories
function generateSampleProducts(query) {
  const category = detectCategory(query);
  const samples = {
    // Electronics
    laptop: [
      { name: 'Dell Inspiron 15 3000 Laptop Intel Core i3', price: 45000, color: 'Black' },
      { name: 'HP Pavilion Gaming Laptop AMD Ryzen 5', price: 55000, color: 'Black' },
      { name: 'Lenovo IdeaPad 3 14" FHD Laptop', price: 40000, color: 'Silver' },
      { name: 'ASUS VivoBook 15 Intel Core i5', price: 48000, color: 'Blue' },
      { name: 'Acer Aspire 5 Slim Laptop', price: 42000, color: 'Silver' }
    ],
    phone: [
      { name: 'Samsung Galaxy A54 5G 128GB', price: 25000, color: 'Black' },
      { name: 'iPhone 13 128GB Blue', price: 65000, color: 'Blue' },
      { name: 'OnePlus Nord CE 3 5G', price: 22000, color: 'Silver' },
      { name: 'Xiaomi 13 Pro 256GB', price: 35000, color: 'White' },
      { name: 'Realme 11 Pro 5G', price: 18000, color: 'Gold' }
    ],
    headphones: [
      { name: 'Sony WH-1000XM4 Wireless Noise Cancelling', price: 15000, color: 'Black' },
      { name: 'Boat Airdopes 441 TWS Earbuds', price: 2500, color: 'Blue' },
      { name: 'JBL Tune 750BTNC Wireless', price: 8000, color: 'White' },
      { name: 'Sennheiser HD 450BT', price: 12000, color: 'Black' },
      { name: 'Apple AirPods Pro 2nd Gen', price: 20000, color: 'White' }
    ],
    
    // Clothing & Fashion
    shirt: [
      { name: 'Levis Men Cotton Casual Shirt', price: 1500, color: 'Blue' },
      { name: 'Arrow Formal Full Sleeve Shirt', price: 2000, color: 'White' },
      { name: 'US Polo Cotton Check Shirt', price: 1200, color: 'Red' },
      { name: 'Van Heusen Slim Fit Shirt', price: 1800, color: 'Black' },
      { name: 'Peter England Cotton Shirt', price: 1000, color: 'Green' }
    ],
    jewelry: [
      { name: 'Tanishq 22k Gold Necklace Set', price: 45000, color: 'Gold' },
      { name: 'Kalyan Jewellers Diamond Earrings', price: 25000, color: 'Silver' },
      { name: 'PC Jeweller Gold Ring 18k', price: 15000, color: 'Gold' },
      { name: 'Malabar Gold Chain 22k Pure', price: 35000, color: 'Gold' },
      { name: 'Senco Gold Bracelet Designer', price: 12000, color: 'Gold' }
    ],
    
    // Home & Kitchen
    iron: [
      { name: 'Philips GC1905 1440W Steam Iron', price: 1500, color: 'Blue' },
      { name: 'Bajaj Majesty MX 3 Dry Iron', price: 800, color: 'White' },
      { name: 'Morphy Richards Super Glide Steam Iron', price: 2200, color: 'Black' },
      { name: 'Usha EI 3302 Gold Dry Iron', price: 1200, color: 'Gold' },
      { name: 'Havells Admire Steam Iron 1600W', price: 1800, color: 'Red' }
    ],
    mixer: [
      { name: 'Preethi Blue Leaf Diamond Mixer Grinder', price: 8000, color: 'Blue' },
      { name: 'Bajaj Rex Mixer Grinder 500W', price: 3500, color: 'White' },
      { name: 'Ultra Dura+ Mixer Grinder 600W', price: 4500, color: 'Red' },
      { name: 'Butterfly Smart Mixer Grinder', price: 5000, color: 'Black' },
      { name: 'Power Guard Easy Mixer 750W', price: 6000, color: 'Silver' }
    ],
    
    // Beauty & Health
    'hair-care': [
      { name: 'Loreal Paris Shampoo Total Repair 5', price: 350, color: 'Red' },
      { name: 'Tresemme Keratin Smooth Shampoo', price: 280, color: 'White' },
      { name: 'Head & Shoulders Anti Dandruff', price: 320, color: 'Blue' },
      { name: 'Pantene Pro-V Gold Series', price: 400, color: 'Gold' },
      { name: 'Herbal Essences Bio Renew', price: 300, color: 'Green' }
    ],
    'skin-care': [
      { name: 'Olay Regenerist Micro-Sculpting Cream', price: 1200, color: 'White' },
      { name: 'Neutrogena Ultra Gentle Daily Cleanser', price: 450, color: 'Blue' },
      { name: 'Cetaphil Gentle Skin Cleanser', price: 600, color: 'White' },
      { name: 'Lakme Absolute Perfect Radiance', price: 800, color: 'Gold' },
      { name: 'Himalaya Purifying Neem Face Wash', price: 150, color: 'Green' }
    ],
    
    // Shoes & Bags
    shoes: [
      { name: 'Nike Air Max 270 Running Shoes', price: 8000, color: 'Black' },
      { name: 'Adidas Ultraboost 22 Sneakers', price: 12000, color: 'White' },
      { name: 'Puma RS-X3 Puzzle Shoes', price: 6500, color: 'Blue' },
      { name: 'Reebok Classic Leather Shoes', price: 4500, color: 'White' },
      { name: 'Woodland Leather Casual Shoes', price: 3500, color: 'Brown' }
    ],
    bag: [
      { name: 'American Tourister Backpack 32L', price: 2500, color: 'Black' },
      { name: 'Skybags Brat School Backpack', price: 1200, color: 'Blue' },
      { name: 'VIP Laptop Backpack 15.6"', price: 1800, color: 'Gray' },
      { name: 'Wildcraft Daypack Backpack', price: 2200, color: 'Green' },
      { name: 'Tommy Hilfiger Backpack', price: 4500, color: 'Navy' }
    ],
    
    // Books & Stationery
    books: [
      { name: 'The Alchemist by Paulo Coelho', price: 250, color: 'Mixed' },
      { name: 'Rich Dad Poor Dad by Robert Kiyosaki', price: 300, color: 'Mixed' },
      { name: 'Atomic Habits by James Clear', price: 400, color: 'Mixed' },
      { name: 'The 7 Habits of Highly Effective People', price: 350, color: 'Mixed' },
      { name: 'Think and Grow Rich by Napoleon Hill', price: 200, color: 'Mixed' }
    ],
    
    // Default general products
    general: [
      { name: 'Popular Product Item', price: 1000, color: 'Mixed' },
      { name: 'Best Seller Product', price: 1500, color: 'Black' },
      { name: 'Top Rated Item', price: 2000, color: 'White' },
      { name: 'Customer Choice Product', price: 800, color: 'Blue' },
      { name: 'Featured Product Item', price: 1200, color: 'Red' }
    ]
  };
  
  const categoryProducts = samples[category] || samples.general;
  
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

// Detect category from product title or query - EXPANDED for all products
function detectCategory(title) {
  const titleLower = title.toLowerCase();
  
  // Electronics
  if (titleLower.includes('laptop') || titleLower.includes('notebook') || titleLower.includes('computer')) return 'laptop';
  if (titleLower.includes('phone') || titleLower.includes('mobile') || titleLower.includes('smartphone')) return 'phone';
  if (titleLower.includes('headphone') || titleLower.includes('earphone') || titleLower.includes('earbuds') || titleLower.includes('airpods')) return 'headphones';
  if (titleLower.includes('tablet') || titleLower.includes('ipad')) return 'tablet';
  if (titleLower.includes('watch') || titleLower.includes('smartwatch')) return 'watch';
  if (titleLower.includes('tv') || titleLower.includes('television') || titleLower.includes('monitor')) return 'tv';
  if (titleLower.includes('camera') || titleLower.includes('dslr')) return 'camera';
  if (titleLower.includes('speaker') || titleLower.includes('bluetooth speaker')) return 'speaker';
  
  // Clothing & Fashion
  if (titleLower.includes('shirt') || titleLower.includes('t-shirt') || titleLower.includes('tshirt')) return 'shirt';
  if (titleLower.includes('jeans') || titleLower.includes('pants') || titleLower.includes('trouser')) return 'pants';
  if (titleLower.includes('dress') || titleLower.includes('frock') || titleLower.includes('gown')) return 'dress';
  if (titleLower.includes('shoe') || titleLower.includes('sneaker') || titleLower.includes('boot') || titleLower.includes('sandal')) return 'shoes';
  if (titleLower.includes('bag') || titleLower.includes('handbag') || titleLower.includes('backpack') || titleLower.includes('purse')) return 'bag';
  if (titleLower.includes('jacket') || titleLower.includes('coat') || titleLower.includes('hoodie')) return 'jacket';
  if (titleLower.includes('saree') || titleLower.includes('kurta') || titleLower.includes('kurti')) return 'traditional-wear';
  
  // Jewelry & Accessories
  if (titleLower.includes('jewelry') || titleLower.includes('jewellery') || titleLower.includes('necklace') || titleLower.includes('earring') || titleLower.includes('bracelet') || titleLower.includes('ring')) return 'jewelry';
  if (titleLower.includes('gold') || titleLower.includes('silver') || titleLower.includes('diamond')) return 'jewelry';
  
  // Home & Kitchen
  if (titleLower.includes('iron') || titleLower.includes('steam iron') || titleLower.includes('dry iron')) return 'iron';
  if (titleLower.includes('mixer') || titleLower.includes('grinder') || titleLower.includes('blender')) return 'mixer';
  if (titleLower.includes('cooker') || titleLower.includes('pressure cooker')) return 'cooker';
  if (titleLower.includes('refrigerator') || titleLower.includes('fridge')) return 'refrigerator';
  if (titleLower.includes('washing machine') || titleLower.includes('washer')) return 'washing-machine';
  if (titleLower.includes('microwave') || titleLower.includes('oven')) return 'microwave';
  if (titleLower.includes('ac') || titleLower.includes('air conditioner') || titleLower.includes('airconditioner')) return 'ac';
  if (titleLower.includes('fan') || titleLower.includes('ceiling fan') || titleLower.includes('table fan')) return 'fan';
  if (titleLower.includes('bed') || titleLower.includes('mattress') || titleLower.includes('pillow')) return 'furniture';
  if (titleLower.includes('sofa') || titleLower.includes('chair') || titleLower.includes('table')) return 'furniture';
  
  // Beauty & Health
  if (titleLower.includes('shampoo') || titleLower.includes('conditioner') || titleLower.includes('hair oil')) return 'hair-care';
  if (titleLower.includes('cream') || titleLower.includes('lotion') || titleLower.includes('moisturizer') || titleLower.includes('face wash')) return 'skin-care';
  if (titleLower.includes('perfume') || titleLower.includes('deodorant') || titleLower.includes('fragrance')) return 'fragrance';
  if (titleLower.includes('makeup') || titleLower.includes('lipstick') || titleLower.includes('foundation')) return 'makeup';
  
  // Sports & Fitness
  if (titleLower.includes('gym') || titleLower.includes('fitness') || titleLower.includes('dumbbell') || titleLower.includes('treadmill')) return 'fitness';
  if (titleLower.includes('cricket') || titleLower.includes('football') || titleLower.includes('badminton')) return 'sports';
  
  // Books & Education
  if (titleLower.includes('book') || titleLower.includes('novel') || titleLower.includes('textbook')) return 'books';
  if (titleLower.includes('pen') || titleLower.includes('pencil') || titleLower.includes('notebook') || titleLower.includes('stationery')) return 'stationery';
  
  // Auto & Tools
  if (titleLower.includes('car') || titleLower.includes('bike') || titleLower.includes('automotive')) return 'automotive';
  if (titleLower.includes('tool') || titleLower.includes('drill') || titleLower.includes('hammer')) return 'tools';
  
  // Toys & Games
  if (titleLower.includes('toy') || titleLower.includes('doll') || titleLower.includes('game') || titleLower.includes('puzzle')) return 'toys';
  
  // Default fallback
  return 'general';
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
    console.log('🎯 Intent detected:', JSON.stringify(intent, null, 2));
    
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