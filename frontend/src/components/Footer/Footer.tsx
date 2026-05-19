export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-12 px-6 mt-24">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-4">
          <a href="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="w-6 h-6 bg-black rounded-full grid place-items-center">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            ShortLK
          </a>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} ShortLK Technologies, Inc. All rights reserved.
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500 font-medium">
          <a href="#" className="hover:text-gray-900 transition-colors">Twitter</a>
          <a href="#" className="hover:text-gray-900 transition-colors">GitHub</a>
          <a href="#" className="hover:text-gray-900 transition-colors">LinkedIn</a>
          <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
          <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
        </div>
      </div>
    </footer>
  );
}