import React from 'react';
import { ArrowDown, Sparkles, ShieldCheck, Sprout, Sun, Calendar } from 'lucide-react';
import { farmImages } from '../assets/farmImages';

interface HeroProps {
  onShopClick: () => void;
  onAdviceClick: () => void;
  onCropsClick: () => void;
  onOpenFarmGate?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onShopClick, onAdviceClick, onCropsClick, onOpenFarmGate }) => {
  return (
    <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-[#FAF8F5] via-[#F5FAF2] to-[#FAF8F5] pt-8 pb-14 sm:pt-12 sm:pb-20 border-b border-[#DDE7DA]">
      {/* Sunlit aura */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Column: Story & Call to Action */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            {/* Tagline kicker with rich emerald & gold colors */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100/90 border border-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-900 mb-4 shadow-2xs self-start">
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span>Authentic Homestead Stewardship · From Damak Farm</span>
            </div>

            {/* Headline */}
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-[3.25rem] leading-[1.12] font-bold text-[#113824] tracking-tight mb-6" style={{ textWrap: 'balance' }}>
              Rare heirloom harvests & ethically raised heritage livestock.
            </h1>

            {/* Description measure 65-75ch */}
            <p className="text-base sm:text-lg text-[#374B3C] leading-relaxed max-w-xl mb-8">
              We cultivate rare seasonal crops like fractal Romanesco and purple majesty fingerlings, alongside free-range pearl guinea fowl, heritage Bourbon Red turkeys, gentle Flemish Giant rabbits, and lively farm cavies. Grown with living soil, fresh well water, and generational care.
            </p>

            {/* Primary Action Buttons with Vibrant Colors */}
            <div className="flex flex-wrap items-center gap-3.5 mb-8">
              <button
                onClick={onCropsClick}
                className="px-6 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-[#164E2D] to-[#1E6B3C] rounded-xl hover:from-[#113824] hover:to-[#164E2D] active:scale-[0.98] transition-all shadow-md shadow-emerald-900/15 cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <Sprout className="w-4 h-4 text-emerald-300" />
                <span>Explore Our Crops</span>
              </button>

              <button
                onClick={onShopClick}
                className="px-6 py-3.5 text-sm font-bold text-[#113824] bg-white border-2 border-emerald-300 hover:bg-emerald-50 rounded-xl active:scale-[0.98] transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                Shop Current Harvest
              </button>

              {onOpenFarmGate && (
                <button
                  onClick={onOpenFarmGate}
                  className="px-5 py-3.5 text-sm font-bold text-amber-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 border border-amber-300 rounded-xl active:scale-[0.98] transition-all shadow-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Calendar className="w-4 h-4 text-amber-950" />
                  <span>Visit Farm</span>
                </button>
              )}

              <button
                onClick={onAdviceClick}
                className="px-5 py-3.5 text-sm font-semibold text-[#854D0E] bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-xl active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
              >
                Farmer&apos;s Advice
              </button>
            </div>

            {/* Farm Origin Signoff */}
            <div className="flex items-center gap-4 pt-4 border-t border-[#DDE7DA] text-xs text-[#526656]">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Organically Managed</span>
              </div>
              <span aria-hidden="true">·</span>
              <span>Farm Gate Pickup & Insulated Express</span>
              <span aria-hidden="true">·</span>
              <span className="font-serif italic font-bold text-emerald-700">Est. 1998</span>
            </div>
          </div>

          {/* Right Column: Hero Visual Asset */}
          <div className="lg:col-span-6 relative flex flex-col">
            <div className="relative w-full h-full min-h-[360px] sm:min-h-[460px] rounded-3xl overflow-hidden border-2 border-emerald-200/90 bg-emerald-950 shadow-xl">
              <img
                src={farmImages.heroFarm}
                alt="Damak Farm morning harvest across organic vegetable beds and rustic farmstead"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-[1.02]"
              />

              {/* Bottom caption overlay with rich agrarian gradient */}
              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-emerald-950/90 via-emerald-950/40 to-transparent text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Sunrise Field Harvest
                    </span>
                    <p className="font-serif text-lg sm:text-xl font-bold text-white leading-tight mt-0.5">
                      Living Soil Terraces & Free-Range Aviaries
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs bg-emerald-800/80 backdrop-blur-md border border-emerald-500/40 px-3 py-1.5 rounded-lg text-white font-mono tabular-nums font-semibold">
                      Ridgefield Homestead
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Proof Metrics Strip with Vibrant Color Coding */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-10 mt-10 border-t border-[#DDE7DA]">
          <div className="p-4 bg-white/90 rounded-2xl border border-emerald-200 shadow-2xs">
            <span className="block font-serif text-2xl sm:text-3xl font-bold text-emerald-800 font-mono-numbers">
              24+
            </span>
            <span className="text-xs font-bold text-[#113824] mt-1 block">
              Rare & Heirloom Crop Varieties
            </span>
            <span className="text-[11px] text-[#55695C] block">Romanesco, Fingerlings & Chard</span>
          </div>

          <div className="p-4 bg-white/90 rounded-2xl border border-amber-200 shadow-2xs">
            <span className="block font-serif text-2xl sm:text-3xl font-bold text-amber-700 font-mono-numbers">
              0
            </span>
            <span className="text-xs font-bold text-amber-950 mt-1 block">
              Synthetic Fertilizers or Sprays
            </span>
            <span className="text-[11px] text-[#78644A] block">100% Living Soil Microbes</span>
          </div>

          <div className="p-4 bg-white/90 rounded-2xl border border-rose-200 shadow-2xs">
            <span className="block font-serif text-2xl sm:text-3xl font-bold text-rose-700 font-mono-numbers">
              4 Breeds
            </span>
            <span className="text-xs font-bold text-rose-950 mt-1 block">
              Heritage Poultry, Rabbits & Cavies
            </span>
            <span className="text-[11px] text-[#70525A] block">Guinea Fowl, Turkeys & Flemish</span>
          </div>

          <div className="p-4 bg-white/90 rounded-2xl border border-purple-200 shadow-2xs">
            <span className="block font-serif text-2xl sm:text-3xl font-bold text-purple-700 font-mono-numbers">
              Dawn
            </span>
            <span className="text-xs font-bold text-purple-950 mt-1 block">
              Same-Day Morning Field Harvest
            </span>
            <span className="text-[11px] text-[#635370] block">Picked & Dispatched at Peak Crisp</span>
          </div>
        </div>
      </div>
    </section>
  );
};
