import './ProductModal.css'

function ProductModal({ product, onClose }) {
  if (!product) return null;

  const handleOpenStore = () => {
    const url = product.storeUrl || `https://example.com/product/${product.id}`;
    window.open(url, '_blank');
  };

  // Generate random features for demo
  const features = [
    "Free shipping available",
    "30-day return policy",
    "1-year warranty included",
    "Secure payment options",
    "24/7 customer support"
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-body">
          <div className="modal-image">
            <img 
              src={product.image || 'https://via.placeholder.com/400x300?text=Product+Image'} 
              alt={product.name}
            />
          </div>
          
          <div className="modal-details">
            <h2>{product.name}</h2>
            <p className="modal-price">₹{product.price.toLocaleString()}</p>
            <p className="modal-category">Category: {product.category}</p>
            <p className="modal-rating">Rating: ⭐ {product.rating || '4.0'} ({(Math.floor(Math.random() * 100 + 50))} reviews)</p>
            
            <div className="modal-description">
              <h3>Product Description</h3>
              <p>
                {product.description || `Discover the amazing features of this ${product.category}. This premium product offers exceptional quality and value. Perfect for your needs with reliable performance and stylish design.`}
              </p>
            </div>
            
            <div className="modal-features">
              <h3>Key Features</h3>
              <ul>
                {features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
            
            <button 
              className="modal-buy-btn"
              onClick={handleOpenStore}
            >
              🛍️ View on Store
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductModal;