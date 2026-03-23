import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="h-auto bg-maroon-800 text-white flex-shrink-0 border-t border-maroon-700 flex flex-col sm:flex-row items-center justify-between px-4 py-2 gap-1">
      <p className="text-sm text-white/90 text-center">
        © {new Date().getFullYear()} Liceo de Cagayan University Clinic. All rights reserved.
      </p>
      <Link
        to="/privacy-policy"
        className="text-xs text-white/60 hover:text-white/90 transition-colors underline underline-offset-2"
      >
        Privacy Policy
      </Link>
    </footer>
  );
}
