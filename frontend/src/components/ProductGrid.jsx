import { useState } from 'react';
import ProductModal from './ProductModal';
import './ProductGrid.css'

function ProductGrid({ products }) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleOpenStore = (product) => {
    const url = product.storeUrl || `https://example.com/product/${product.id}`;
    window.open(url, '_blank');
  };

  // Format price with commas
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <>
      <div className="product-grid-container">
        <div className="product-grid-header">
          <h2>🛒 Products 
            {products.length > 0 && (
              <span className="products-count">({products.length} items)</span>
            )}
          </h2>
        </div>
        
        {products.length === 0 ? (
          <div className="no-products">
            <div className="no-products-icon">🛍️</div>
            <h3>No Products Yet</h3>
            <p>Start a conversation with the AI assistant to discover amazing products!</p>
            <div className="examples">
              <p><strong>Try asking:</strong></p>
              <ul>
                <li>"Show me laptops under ₹50,000"</li>
                <li>"I want a Samsung phone"</li>
                <li>"Headphones under ₹5,000"</li>
                <li>"Red colored watches"</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="product-grid">
            {products.map(product => (
              <div key={product.id} className="product-card">
                <img 
                  src={product.image || 'https://via.placeholder.com/300x180?text=Product+Image'} 
                  alt={product.name}
                  className="product-image"
                  onClick={() => setSelectedProduct(product)}
                />
                <h3 onClick={() => setSelectedProduct(product)}>{product.name}</h3>
                <p className="product-price">{formatPrice(product.price)}</p>
                <p className="product-category">{product.category}</p>
                <p className="product-rating">
                  ⭐ {product.rating || '4.0'} 
                  <span style={{ color: '#6c757d', marginLeft: '0.5rem' }}>
                    ({product.reviews || Math.floor(Math.random() * 100 + 50)} reviews)
                  </span>
                </p>
                
                <button 
                  className="open-store-btn"
                  onClick={() => handleOpenStore(product)}
                >
                  🛍️ View on Store
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <ProductModal 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />
    </>
  )
}

export default ProductGrid