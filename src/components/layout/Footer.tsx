export function Footer() {
  return (
    <footer className="h-20 bg-maroon-900 text-white flex-shrink-0 border-t border-maroon-800 flex items-center justify-center">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex flex-col gap-1 text-sm">
          <p>© {new Date().getFullYear()} Liceo de Cagayan University Clinic</p>
          <p className="text-white/80">All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
