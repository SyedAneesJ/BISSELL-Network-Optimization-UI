import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { compactSelectBaseClass } from './formStyles';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  placeholder = 'Select an option',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`${compactSelectBaseClass} flex items-center justify-between bg-white text-left w-full ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:border-blue-400'}`}
      >
        <span className="block truncate pr-5">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[999] mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No options</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                }}
                className={`relative flex w-full cursor-default select-none items-center px-3 py-1.5 text-sm outline-none transition-colors ${
                  option.disabled ? 'text-slate-400 opacity-50' : 'text-slate-900 hover:bg-slate-100 hover:text-slate-900'
                } ${value === option.value ? 'bg-blue-50/50 font-medium text-blue-900' : ''}`}
                title={typeof option.label === 'string' ? option.label : undefined}
              >
                <div className="flex flex-1 truncate text-left items-center">
                  <span className="truncate">{option.label}</span>
                </div>
                {value === option.value && (
                  <Check className="ml-2 h-4 w-4 shrink-0 text-blue-600" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
