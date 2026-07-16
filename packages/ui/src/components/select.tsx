'use client';

import { Check, ChevronDown } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn.js';

export interface SelectOption {
  value: string;
  label: ReactNode;
  /** Plain string used for typeahead and the closed trigger when `label` is rich. */
  textValue?: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value' | 'children'> {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Shown when `value` is empty / unmatched. */
  placeholder?: string;
  /** Marks the field invalid for a11y (pairs with form errors). */
  invalid?: boolean;
  /** Optional id for the listbox (defaults to a generated id). */
  listboxId?: string;
}

function optionText(option: SelectOption): string {
  if (option.textValue) return option.textValue;
  return typeof option.label === 'string' ? option.label : String(option.value);
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    options,
    value,
    onChange,
    placeholder = 'Select…',
    invalid = false,
    disabled,
    className,
    id,
    listboxId: listboxIdProp,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const listboxId = listboxIdProp ?? `${generatedId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const setButtonRef = useCallback(
    (node: HTMLButtonElement | null) => {
      buttonRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const selected = options.find((o) => o.value === value);
  const enabledIndexes = options
    .map((o, i) => (o.disabled ? -1 : i))
    .filter((i) => i >= 0);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    const selectedIdx = options.findIndex((o) => o.value === value && !o.disabled);
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : (enabledIndexes[0] ?? -1));
    setOpen(true);
  }, [disabled, enabledIndexes, options, value]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [close, open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const commit = (next: string) => {
    onChange(next);
    close();
    buttonRef.current?.focus();
  };

  const moveActive = (delta: number) => {
    if (enabledIndexes.length === 0) return;
    const currentPos = enabledIndexes.indexOf(activeIndex);
    const start = currentPos >= 0 ? currentPos : delta > 0 ? -1 : 0;
    const nextPos = (start + delta + enabledIndexes.length) % enabledIndexes.length;
    setActiveIndex(enabledIndexes[nextPos]!);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!open) openList();
        else if (event.key === 'Enter' || event.key === ' ') {
          const opt = options[activeIndex];
          if (opt && !opt.disabled) commit(opt.value);
        } else if (event.key === 'ArrowDown') moveActive(1);
        else moveActive(-1);
        break;
      case 'Home':
        if (open && enabledIndexes[0] !== undefined) {
          event.preventDefault();
          setActiveIndex(enabledIndexes[0]);
        }
        break;
      case 'End':
        if (open) {
          const last = enabledIndexes[enabledIndexes.length - 1];
          if (last !== undefined) {
            event.preventDefault();
            setActiveIndex(last);
          }
        }
        break;
      default:
        break;
    }
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        event.preventDefault();
        if (enabledIndexes[0] !== undefined) setActiveIndex(enabledIndexes[0]);
        break;
      case 'End': {
        event.preventDefault();
        const last = enabledIndexes[enabledIndexes.length - 1];
        if (last !== undefined) setActiveIndex(last);
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const opt = options[activeIndex];
        if (opt && !opt.disabled) commit(opt.value);
        break;
      }
      case 'Tab':
        close();
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        {...props}
        ref={setButtonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={invalid || undefined}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 text-left text-sm text-ink',
          'outline-none transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-emphasis)',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          'disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-ink',
          invalid ? 'border-error' : 'border-line-2 hover:border-line-2',
          className,
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-muted')}>
          {selected ? optionText(selected) : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted transition-transform duration-(--duration-fast)',
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
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          onKeyDown={onListKeyDown}
          className={cn(
            'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-line bg-elevated py-1 shadow-md',
            'outline-none',
          )}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.value === '' ? `__empty-${index}` : option.value}
                id={`${listboxId}-opt-${index}`}
                role="option"
                data-index={index}
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm text-ink',
                  option.disabled && 'cursor-not-allowed opacity-50',
                  isActive && !option.disabled && 'bg-canvas-2',
                  isSelected && 'font-medium',
                )}
                onMouseEnter={() => {
                  if (!option.disabled) setActiveIndex(index);
                }}
                onMouseDown={(event) => {
                  // Prevent button blur before click commits.
                  event.preventDefault();
                }}
                onClick={() => {
                  if (!option.disabled) commit(option.value);
                }}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {isSelected ? <Check className="size-4 shrink-0 text-accent" aria-hidden /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
});
