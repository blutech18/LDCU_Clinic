export function Footer() {
  return (
    <footer className="bg-maroon-800 text-white py-3 flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex flex-col gap-1 text-sm">
          <p>© {new Date().getFullYear()} Liceo de Cagayan University Clinic</p>
          <p className="text-white/80">All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
