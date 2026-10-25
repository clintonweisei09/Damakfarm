import React, { useState } from 'react';
import { ShoppingBag, Menu, X, Sprout, MapPin, Wheat, Sun, Calendar, Globe } from 'lucide-react';
import { CartItem } from '../types/farm';
import { useCurrency, Currency } from '../context/CurrencyContext';

interface NavbarProps {
  cartItems: CartItem[];
  onOpenCart: () => void;
  onNavigateSection: (sectionId: string) => void;
  onOpenFarmGate: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartItems,
  onOpenCart,
  onNavigateSection,
  onOpenFarmGate,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currency, setCurrency, formatPrice } = useCurrency();

  const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const handleNavClick = (sectionId: string) => {
    onNavigateSection(sectionId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F2F8F0]/95 backdrop-blur-md border-b-2 border-emerald-300/80 shadow-xs transition-colors">
      {/* Light Agricultural Announcement Top Ribbon */}
      <div className="bg-gradient-to-r from-emerald-100 via-amber-50 to-emerald-100 border-b border-emerald-200/80 text-[11px] font-semibold text-emerald-900 py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 truncate">
            <span className="inline-flex items-center gap-1 text-emerald-800 font-bold uppercase tracking-wider text-[10px] bg-emerald-200/90 px-2 py-0.5 rounded">
              <Wheat className="w-3 h-3 text-emerald-800" />
              Harvest Active
            </span>
            <span className="truncate">
              Morning picked: Romanesco, Purple Fingerlings & Fresh Speckled Guinea Eggs
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
            {/* Currency Switcher in Header (Default: KES) */}
            <div className="flex items-center gap-1 bg-white/90 border border-emerald-300 rounded-lg px-2 py-0.5 shadow-2xs">
              <Globe className="w-3 h-3 text-emerald-700 shrink-0" />
              <label htmlFor="currency-select" className="text-[10px] uppercase font-bold text-emerald-800">
                Currency:
              </label>
              <select
                id="currency-select"
                aria-label="Currency Switcher"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="bg-transparent text-[11px] font-bold text-emerald-950 focus:outline-none cursor-pointer"
              >
                <option value="KES">KES (KSh - Default)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <button
              onClick={onOpenFarmGate}
              className="hidden sm:flex text-emerald-800 hover:text-emerald-950 items-center gap-1 cursor-pointer underline underline-offset-2"
            >
              <MapPin className="w-3 h-3 text-emerald-700" />
              <span>Visiting (Fri–Sun)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-6 lg:gap-8 h-16 sm:h-20">
          {/* Zone 1: Brand Wordmark with Authentic Agricultural Style */}
          <button
            onClick={() => handleNavClick('hero')}
            className="flex items-center gap-2 sm:gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg group cursor-pointer shrink-0"
          >
            {/* Handcrafted Agriculture Emblem */}
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#164E2D] via-[#1E6B3C] to-[#2D6A4F] text-[#FAF8F5] flex items-center justify-center shrink-0 shadow-md ring-2 ring-emerald-300 group-hover:scale-105 transition-transform duration-200">
              <Sprout className="w-6 h-6 text-emerald-200 drop-shadow-xs" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border border-[#164E2D] flex items-center justify-center">
                <Sun className="w-2.5 h-2.5 text-amber-950" />
              </div>
            </div>

            {/* Typography in Heritage Agrarian Style */}
            <div className="flex flex-col">
              <span className="font-serif text-xl sm:text-[1.75rem] font-black tracking-tight text-[#0F381E] whitespace-nowrap shrink-0 group-hover:text-emerald-800 transition-colors drop-shadow-2xs">
                Damak Farm
              </span>
              <div className="hidden sm:flex items-center gap-1.5 -mt-0.5">
                <span className="text-[10px] tracking-[0.16em] uppercase font-extrabold text-emerald-800">
                  From Damak Farm
                </span>
                <span className="text-[10px] text-amber-600 font-bold font-serif italic">
                  · Est. 1998
                </span>
              </div>
            </div>
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-sm font-bold text-[#1F432A]">
            <button
              onClick={() => handleNavClick('crops')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-8 cursor-pointer text-emerald-900"
            >
              Our Crops
            </button>
            <button
              onClick={() => handleNavClick('catalog')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-8 cursor-pointer"
            >
              Shop Harvest
            </button>
            <button
              onClick={() => handleNavClick('rare-produce')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-8 cursor-pointer"
            >
              Rare Produce
            </button>
            <button
              onClick={() => handleNavClick('livestock')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-8 cursor-pointer"
            >
              Poultry & Animals
            </button>
            <button
              onClick={() => handleNavClick('custom-box')}
              className="hover:text-amber-800 transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-8 cursor-pointer text-[#854D0E]"
            >
              Farm Box
            </button>
            <button
              onClick={() => handleNavClick('advice')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-8 cursor-pointer"
            >
              Farmer&apos;s Advice
            </button>
          </nav>

          {/* Zone 3: Actions (Background color added to Visit Farm button) */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* Visit Farm Button with distinctive background color! */}
            <button
              onClick={onOpenFarmGate}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 border border-amber-300 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-950" />
              <span>Visit Farm</span>
            </button>

            {/* Shopping Bag Button */}
            <button
              onClick={onOpenCart}
              aria-label={`View harvest bag with ${totalItemCount} items`}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#164E2D] to-[#1E6B3C] rounded-xl hover:from-[#113824] hover:to-[#164E2D] active:scale-[0.98] transition-all shadow-md shadow-emerald-900/15 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-200 shrink-0" />
              <span className="hidden sm:inline">Bag</span>
              <span className="font-mono tabular-nums bg-emerald-800/80 border border-emerald-400/40 px-1.5 py-0.5 rounded text-[11px]">
                {totalItemCount}
              </span>
              {cartSubtotal > 0 && (
                <span className="hidden sm:inline font-mono tabular-nums text-emerald-100 border-l border-emerald-600/60 pl-2">
                  {formatPrice(cartSubtotal)}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-emerald-900 hover:bg-emerald-100/80 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation drawer with light agricultural style */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#F2F8F0] border-b-2 border-emerald-300 px-6 py-5 space-y-3.5 animate-in fade-in duration-150">
          {/* Currency Switcher in Mobile Drawer */}
          <div className="flex items-center justify-between pb-3 border-b border-emerald-200 text-xs">
            <span className="font-bold text-emerald-900">Select Currency:</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="bg-white border border-emerald-300 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-950"
            >
              <option value="KES">KES (KSh - Default)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <button
            onClick={() => handleNavClick('crops')}
            className="block w-full text-left py-2 text-base font-bold text-emerald-900 hover:text-emerald-700"
          >
            🌾 What We Grow (Our Crops)
          </button>
          <button
            onClick={() => handleNavClick('catalog')}
            className="block w-full text-left py-2 text-base font-medium text-emerald-900 hover:text-emerald-700"
          >
            🛒 Shop Farm Harvest
          </button>
          <button
            onClick={() => handleNavClick('rare-produce')}
            className="block w-full text-left py-2 text-base font-medium text-emerald-900 hover:text-emerald-700"
          >
            ✨ Rare & Heirloom Crops
          </button>
          <button
            onClick={() => handleNavClick('livestock')}
            className="block w-full text-left py-2 text-base font-medium text-emerald-900 hover:text-emerald-700"
          >
            🦃 Guinea Fowl, Turkeys, Rabbits & Cavies
          </button>
          <button
            onClick={() => handleNavClick('custom-box')}
            className="block w-full text-left py-2 text-base font-medium text-amber-900 hover:text-amber-700"
          >
            📦 Curated Farm Harvest Box
          </button>
          <button
            onClick={() => handleNavClick('advice')}
            className="block w-full text-left py-2 text-base font-medium text-emerald-900 hover:text-emerald-700"
          >
            📖 Farmer&apos;s Advice & Wisdom
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenFarmGate();
            }}
            className="block w-full text-left py-2 text-base font-bold text-amber-950 bg-amber-200/80 px-3 rounded-lg border border-amber-300"
          >
            📍 Farm Gate Visiting & Directions
          </button>
        </div>
      )}
    </header>
  );
};
