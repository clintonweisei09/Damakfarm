import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { RotatingAdsBanner } from './components/RotatingAdsBanner';
import { CropsSection } from './components/CropsSection';
import { ProductCatalog } from './components/ProductCatalog';
import { CustomFarmBox } from './components/CustomFarmBox';
import { AdviceHub } from './components/AdviceHub';
import { SeasonalAlmanac } from './components/SeasonalAlmanac';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { FarmGateModal } from './components/FarmGateModal';
import { Footer } from './components/Footer';
import { Product, CartItem, ProductCategory, OrderConfirmation } from './types/farm';
import { PRODUCTS } from './data/products';

export default function App() {
  // Initial cart with a nice starter item so ecommerce functionality is immediately tangible
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      product: PRODUCTS[0], // Fractal Romanesco Cauliflower
      quantity: 1,
    },
    {
      product: PRODUCTS[1], // Purple Majesty Fingerlings
      quantity: 1,
    },
  ]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isFarmGateOpen, setIsFarmGateOpen] = useState(false);
  const [checkoutFulfillment, setCheckoutFulfillment] = useState<'pickup' | 'delivery'>('pickup');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<ProductCategory>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cart operations
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.product.stockCount, item.quantity + quantity) }
            : item
        );
      } else {
        return [...prev, { product, quantity }];
      }
    });

    setToastMessage(`Added ${quantity}× ${product.name} to harvest bag`);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleStartCheckout = (fulfillment: 'pickup' | 'delivery') => {
    setCheckoutFulfillment(fulfillment);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderCompleted = (order: OrderConfirmation) => {
    // Clear cart upon successful order
    setCartItems([]);
  };

  const handleNavigateSection = (sectionId: string) => {
    if (sectionId === 'rare-produce') {
      setSelectedCategoryFilter('rare-produce');
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    } else if (sectionId === 'livestock') {
      setSelectedCategoryFilter('poultry');
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    } else if (sectionId === 'crops') {
      document.getElementById('crops')?.scrollIntoView({ behavior: 'smooth' });
    } else if (sectionId === 'catalog') {
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    } else if (sectionId === 'custom-box') {
      document.getElementById('custom-box')?.scrollIntoView({ behavior: 'smooth' });
    } else if (sectionId === 'advice') {
      document.getElementById('advice')?.scrollIntoView({ behavior: 'smooth' });
    } else if (sectionId === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#113824]">
      {/* Top Bar Contract Navigation with light agricultural background */}
      <Navbar
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
        onNavigateSection={handleNavigateSection}
        onOpenFarmGate={() => setIsFarmGateOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <Hero
          onShopClick={() => handleNavigateSection('catalog')}
          onAdviceClick={() => handleNavigateSection('advice')}
          onCropsClick={() => handleNavigateSection('crops')}
          onOpenFarmGate={() => setIsFarmGateOpen(true)}
        />

        {/* Dynamic Changing Ads Banner with distinctive background colors */}
        <RotatingAdsBanner />

        {/* Dedicated Crops Section: What We Grow on Damak Farm */}
        <CropsSection
          onAddToCart={handleAddToCart}
          onSelectProduct={(product) => setSelectedProduct(product)}
        />

        {/* Product Catalog & E-Commerce Showcase */}
        <ProductCatalog
          onSelectProduct={(product) => setSelectedProduct(product)}
          onAddToCart={handleAddToCart}
          selectedCategoryFilter={selectedCategoryFilter}
        />

        {/* Custom Farm Box Configurator */}
        <CustomFarmBox
          onAddCustomBoxToCart={(boxProduct) => handleAddToCart(boxProduct, 1)}
        />

        {/* Owner's Advice & Homestead Journal */}
        <AdviceHub
          onSelectProduct={(product) => setSelectedProduct(product)}
        />

        {/* Seasonal Almanac & Farm Gate Calendar */}
        <SeasonalAlmanac
          onOpenFarmGate={() => setIsFarmGateOpen(true)}
        />
      </main>

      {/* Footer with functional links and farm gate scheduler */}
      <Footer
        onNavigateSection={handleNavigateSection}
        onOpenFarmGate={() => setIsFarmGateOpen(true)}
      />

      {/* Product Detail Modal */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onStartCheckout={handleStartCheckout}
      />

      {/* Checkout Modal & Order Manifest */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        defaultFulfillment={checkoutFulfillment}
        onOrderCompleted={handleOrderCompleted}
      />

      {/* Farm Gate & Visiting Modal */}
      <FarmGateModal
        isOpen={isFarmGateOpen}
        onClose={() => setIsFarmGateOpen(false)}
      />

      {/* Subtle Bottom Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#164E2D] text-white px-5 py-3 rounded-xl text-xs font-bold shadow-xl border border-emerald-400 animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
