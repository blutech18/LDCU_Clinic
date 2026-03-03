export function Footer() {
  return (
    <footer className="h-10 bg-maroon-800 text-white flex-shrink-0 border-t border-maroon-700 flex items-center justify-center px-4">
      <p className="text-sm text-white/90 text-center">
        © {new Date().getFullYear()} Liceo de Cagayan University Clinic. All rights reserved.
      </p>
    </footer>
  );
}
