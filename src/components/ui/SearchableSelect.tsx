import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '~/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const updatePosition = () => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const availableBottom = window.innerHeight - rect.bottom;
      const dropdownHeight = 250; // Expected max height
      const dropUp = availableBottom < dropdownHeight && rect.top > availableBottom;

      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        top: dropUp ? 'auto' : rect.bottom + 4,
        bottom: dropUp ? window.innerHeight - rect.top + 4 : 'auto',
        width: rect.width,
        zIndex: 99999, // Ensure it floats above modals
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Use capture mode to catch scroll events from any scrollable container (like modals)
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current && !wrapperRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={cn('relative', className)} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearchTerm('');
        }}
        className="w-full flex items-center justify-between px-3 py-2 min-h-[42px] bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 transition-shadow text-left shadow-sm"
      >
        <span className={cn('block truncate', !selectedOption && 'text-gray-500')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="bg-white rounded-md shadow-xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100 flex items-center gap-2 text-gray-500 flex-shrink-0">
            <Search className="w-4 h-4" />
            <input
              type="text"
              autoFocus
              className="w-full text-sm outline-none bg-transparent"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <ul className="max-h-[250px] overflow-auto py-1 text-sm custom-scrollbar flex-1">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-gray-500 text-center">No options found.</li>
            ) : (
              filteredOptions.map((option) => (
                <li
                  key={option.value}
                  className={cn(
                    'px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-maroon-50 hover:text-maroon-900 transition-colors',
                    value === option.value && 'bg-maroon-50 text-maroon-900 font-medium'
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <span className="block truncate">{option.label}</span>
                  {value === option.value && <Check className="w-4 h-4 text-maroon-600 flex-shrink-0" />}
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
