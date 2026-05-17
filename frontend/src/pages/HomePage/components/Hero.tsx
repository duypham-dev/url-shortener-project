import { ArrowUpRight } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative pt-24 pb-20 flex flex-col items-center text-center px-6 overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 z-0 flex justify-center -translate-y-1/2 opacity-30 pointer-events-none">
        <div className="w-[200vw] h-[70vh] flex flex-wrap" style={{
            backgroundImage: 'linear-gradient(to right, #a0a0a0 1px, transparent 1px), linear-gradient(to bottom, #a0a0a0 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, #000 20%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, #000 20%, transparent 100%)'
          }} 
        />
      </div>
      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-gray-900 mb-6 max-w-3xl leading-[1.1]">
          Turn clicks into revenue
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl leading-relaxed">
          ShortLK is the modern link attribution platform for short links, conversion tracking, and affiliate programs.
        </p>

        <div className="flex items-center gap-4">
          <button className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-black/10">
            Start for free
          </button>
          <button className="bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm">
            Get a demo
          </button>
        </div>
      </div>
    </section>
  );
}
