import ImageGenerator from "@/components/ImageGenerator";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-12 md:py-24">
        <header className="text-center mb-16 space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-widest uppercase text-blue-400 mb-2">
            AI Superhero Maker
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 leading-tight">
            SCALE UP CONCLAVE <span className="text-blue-500">2026</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            Generate your personalized event poster in seconds. Just enter your details and upload a photo.
          </p>
        </header>

        <ImageGenerator />

        <footer className="mt-20 text-center text-gray-500 text-sm">
          <p>© 2026 Scaleup Conclave. Big Ideas. AI Innovation.</p>
        </footer>
      </div>
    </main>
  );
}
