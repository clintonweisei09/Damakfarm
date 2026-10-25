import React, { useState } from 'react';
import { Sprout, MapPin, Phone, Mail, Check, Wheat, Sun } from 'lucide-react';

interface FooterProps {
  onNavigateSection: (sectionId: string) => void;
  onOpenFarmGate: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateSection, onOpenFarmGate }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 3000);
  };

  const showCertification = (title: string, msg: string) => {
    setActiveInfo(`${title}: ${msg}`);
    setTimeout(() => setActiveInfo(null), 3500);
  };

  return (
    <footer className="bg-[#142A19] text-[#FAF8F5] pt-16 pb-12 border-t-2 border-emerald-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-[#23422A]">
          {/* Brand Info with Agricultural Style */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center ring-2 ring-emerald-400/40 shadow-sm">
                <Sprout className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <span className="font-serif text-2xl font-black tracking-tight text-[#FAF8F5] block">
                  Damak Farm
                </span>
                <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-emerald-400">
                  From Damak Farm · Est. 1998
                </span>
              </div>
            </div>

            <p className="text-xs text-[#B7C7B5] leading-relaxed max-w-sm">
              Cultivating rare heirloom produce, pasture-raised guinea fowl, heritage Bourbon Red turkeys, gentle Flemish Giant rabbits, and farm cavies on living regenerative soil since 1998.
            </p>

            <div className="space-y-2 text-xs text-[#C8D6C6] pt-2">
              <button
                onClick={onOpenFarmGate}
                className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer text-left"
              >
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>1482 Valley Pasture Road, Ridgefield (Click for Visiting & Map)</span>
              </button>

              <button
                onClick={onOpenFarmGate}
                className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer text-left"
              >
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>(555) 782-3262 (Farm Gate Office & Collection Desk)</span>
              </button>

              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>steward@damakfarm.com</span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Farm Exploration & Sections
            </h4>
            <ul className="space-y-2 text-xs text-[#B7C7B5]">
              <li>
                <button
                  onClick={() => onNavigateSection('crops')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer font-semibold text-white"
                >
                  🌾 What We Grow (Our Crops)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('catalog')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  🛒 Shop Seasonal Harvest
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('rare-produce')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  ✨ Rare & Heirloom Crops
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('livestock')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  🦃 Guinea Fowl & Turkeys
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('livestock')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  🐰 Rabbits & Cavies
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('custom-box')}
                  className="hover:text-amber-300 transition-colors cursor-pointer text-amber-200"
                >
                  📦 Curated Farm Box
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('advice')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  📖 Owner&apos;s Advice & Journal
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenFarmGate}
                  className="hover:text-emerald-300 transition-colors cursor-pointer text-emerald-300"
                >
                  📍 Schedule Paddock Visit
                </button>
              </li>
            </ul>
          </div>

          {/* Seasonal rare drops signup */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Seasonal Rare Harvest Dispatch
            </h4>
            <p className="text-xs text-[#B7C7B5] leading-relaxed">
              Sign up for notifications when limited batches of Romanesco, hatching eggs, or baby Flemish Giants become available.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2.5 text-xs bg-[#0B1A0F] border border-emerald-700/80 rounded-xl text-white placeholder:text-emerald-600/70 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-sm"
                >
                  {subscribed ? <Check className="w-4 h-4 text-white" /> : 'Join'}
                </button>
              </div>
              {subscribed && (
                <p className="text-[11px] text-emerald-300 font-semibold">
                  ✓ Welcome to the Damak Farmstead harvest subscriber list!
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Bottom copyright, developer attribution & active info toast */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#95A58D] border-t border-[#1F3D26] mt-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <p>© {new Date().getFullYear()} Damak Farm. All rights reserved.</p>
            <span aria-hidden="true" className="hidden sm:inline text-emerald-800">·</span>
            {/* Developed by Clinton weisei */}
            <div className="inline-flex items-center gap-1.5 bg-[#0B1A0F] px-3 py-1 rounded-full border border-emerald-600/50 text-[11px] text-emerald-200 shadow-2xs">
              <span className="text-emerald-400">🌱</span>
              <span>Developed by</span>
              <strong className="font-bold text-white tracking-wide">Clinton weisei</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => showCertification('Non-GMO Verified', '100% of our seeds and grains are open-pollinated heirloom landraces without genetic modification.')}
              className="hover:text-emerald-300 cursor-pointer underline underline-offset-2"
            >
              Non-GMO Certified
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => showCertification('Free-Range Stewardship', 'All guinea fowl and turkeys forage open clover pastures; rabbits and cavies enjoy spacious natural hutches with daily meadow hay.')}
              className="hover:text-emerald-300 cursor-pointer underline underline-offset-2"
            >
              Ethical Free-Range Aviary
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={onOpenFarmGate}
              className="hover:text-emerald-300 cursor-pointer underline underline-offset-2"
            >
              Ridgefield Gate Pickup
            </button>
            <span aria-hidden="true">·</span>
            <span className="font-serif italic text-emerald-300 font-semibold">From Damak Farm</span>
          </div>
        </div>

        {/* Informational Toast if clicked */}
        {activeInfo && (
          <div className="mt-4 p-3 bg-emerald-950 border border-emerald-500 rounded-xl text-xs text-emerald-200 animate-in fade-in duration-150">
            {activeInfo}
          </div>
        )}
      </div>
    </footer>
  );
};
