import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="h-auto bg-maroon-800 text-white flex-shrink-0 border-t border-maroon-700 flex flex-col items-center justify-center px-4 py-4 gap-2">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm text-white/90">
          © {new Date().getFullYear()} Liceo de Cagayan University Clinic. All rights reserved.
        </p>
        <p className="text-sm text-white/60 flex items-baseline gap-1.5 mt-1">
          Beta Testing <span className="text-white/40 text-xs">v1.0.0</span>
        </p>
      </div>
      <Link
        to="/privacy-policy"
        className="text-xs text-white/60 hover:text-white/90 transition-colors underline underline-offset-2 mt-1"
      >
        Privacy Policy
      </Link>
    </footer>
  );
}
