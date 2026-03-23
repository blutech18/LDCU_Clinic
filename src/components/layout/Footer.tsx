import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="h-auto bg-maroon-800 text-white flex-shrink-0 border-t border-maroon-700 flex flex-col items-center justify-center px-4 py-4 gap-3">
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center">
        <p className="text-sm text-white/90">
          © {new Date().getFullYear()} Liceo de Cagayan University Clinic. All rights reserved.
        </p>
        <span className="hidden sm:inline text-white/40">•</span>
        <div className="flex items-center justify-center gap-2">
          <span className="px-2 py-0.5 bg-blue-600/30 text-blue-200 text-xs font-semibold rounded border border-blue-400/30">
            BETA v1.0.0
          </span>
          <span className="text-xs text-white/60">Beta Testing Phase</span>
        </div>
      </div>
      <Link
        to="/privacy-policy"
        className="text-xs text-white/60 hover:text-white/90 transition-colors underline underline-offset-2"
      >
        Privacy Policy
      </Link>
    </footer>
  );
}
