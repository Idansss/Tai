'use client';

import { Check, ChevronDown } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { cn } from '../lib/cn.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** Currently selected value. Empty string means nothing chosen (shows the placeholder). */
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  /** Shown when no value is selected. */
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Classes merged onto the trigger button (height, border, background overrides). */
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

const triggerClass =
  'flex h-11 w-full items-center justify-between gap-2 rounded-md border border-line-2 bg-surface px-3 text-left text-sm text-ink outline-none transition-colors hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--color-disabled-background)] disabled:text-[var(--color-disabled-text)]';

/**
 * A fully styled dropdown that replaces the native <select>. The closed control and — crucially —
 * the open menu are painted from the design tokens, so the list matches the paper-and-pencil
 * palette in both themes instead of the browser's OS chrome. Implements the ARIA listbox pattern:
 * a button trigger plus a focusable listbox with roving aria-activedescendant.
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  id,
  name,
  disabled,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const typeahead = useRef({ query: '', at: 0 });

  const listboxId = useId();
  const optionId = useCallback((i: number) => `${listboxId}-opt-${i}`, [listboxId]);

  const selectedIndex = useMemo(
    () => options.findIndex((o) => o.value === value),
    [options, value],
  );
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex]!.label : undefined;

  const firstEnabled = useCallback(
    (from: number, dir: 1 | -1) => {
      const n = options.length;
      for (let step = 0; step < n; step++) {
        const i = (((from + dir * step) % n) + n) % n;
        if (!options[i]!.disabled) return i;
      }
      return -1;
    },
    [options],
  );

  const openMenu = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled(0, 1));
  }, [disabled, firstEnabled, selectedIndex]);

  const closeMenu = useCallback((refocus = true) => {
    setOpen(false);
    setActiveIndex(-1);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const choose = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      onValueChange(option.value);
      closeMenu();
    },
    [options, onValueChange, closeMenu],
  );

  // Move focus to the listbox once it opens, and keep the active option in view.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  // Close when focus or a click leaves the component.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeMenu(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, closeMenu]);

  const typeaheadSelect = useCallback(
    (char: string) => {
      const now = Date.now();
      const state = typeahead.current;
      state.query = now - state.at > 600 ? char : state.query + char;
      state.at = now;
      const q = state.query.toLowerCase();
      const match = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(q));
      if (match >= 0) setActiveIndex(match);
    },
    [options],
  );

  const onListKeyDown = useCallback(
    (e: KeyboardEvent<HTMLUListElement>) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => firstEnabled(i < 0 ? 0 : i + 1, 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => firstEnabled(i < 0 ? 0 : i - 1, -1));
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(firstEnabled(0, 1));
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(firstEnabled(options.length - 1, -1));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (activeIndex >= 0) choose(activeIndex);
          break;
        case 'Escape':
          e.preventDefault();
          closeMenu();
          break;
        case 'Tab':
          closeMenu(false);
          break;
        default:
          if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            typeaheadSelect(e.key);
          }
      }
    },
    [activeIndex, choose, closeMenu, firstEnabled, options.length, typeaheadSelect],
  );

  const onTriggerKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (open) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu();
      }
    },
    [open, openMenu],
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
        className={cn(triggerClass, ariaInvalid && 'border-error', className)}
      >
        <span className={cn('truncate', selectedLabel === undefined && 'text-muted')}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted transition-transform duration-[var(--duration-fast)]',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          onKeyDown={onListKeyDown}
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line-2 bg-elevated p-1 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] outline-none"
        >
          {options.map((option, i) => {
            const selected = option.value === value;
            const active = i === activeIndex;
            return (
              <li
                key={option.value}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                id={optionId(i)}
                role="option"
                aria-selected={selected}
                aria-disabled={option.disabled || undefined}
                onMouseEnter={() => !option.disabled && setActiveIndex(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-ink',
                  active && 'bg-surface-2',
                  option.disabled && 'cursor-not-allowed text-muted',
                )}
              >
                <Check
                  className={cn('size-4 shrink-0 text-accent', !selected && 'invisible')}
                  aria-hidden
                />
                <span className="truncate">{option.label}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
