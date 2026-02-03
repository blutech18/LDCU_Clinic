import { cn } from '~/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:scale-105 active:scale-95';

  const variants = {
    primary: 'bg-maroon-800 text-white hover:bg-maroon-700 focus:ring-maroon-500 shadow-md hover:shadow-lg',
    secondary: 'bg-gold-500 text-maroon-900 hover:bg-gold-600 focus:ring-gold-500 shadow-md hover:shadow-lg',
    outline:
      'border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-maroon-500 focus:ring-maroon-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-maroon-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
