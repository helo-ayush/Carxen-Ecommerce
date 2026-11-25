'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Product } from '@/data/products';
import {
  getWholesaleQtyRules,
  snapWholesaleQty,
  stepWholesaleQty,
} from '@/lib/storefront/wholesale-qty';

export interface WholesaleQtyStepperProps {
  product: Pick<Product, 'n' | 'b2bMoq' | 'unitsPerMasterCarton' | 'enforceCartonMultiples'>;
  value: number;
  maxQty?: number | null;
  disabled?: boolean;
  allowZero?: boolean;
  onChange: (nextQty: number) => void;
  wrapperClassName?: string;
  buttonClassName?: string;
  inputClassName?: string;
  iconSize?: number;
}

export function WholesaleQtyStepper({
  product,
  value,
  maxQty,
  disabled = false,
  allowZero = false,
  onChange,
  wrapperClassName = 'ws-stepper',
  buttonClassName = 'ws-stepper-btn',
  inputClassName = 'ws-stepper-input',
  iconSize = 13,
}: WholesaleQtyStepperProps) {
  const { minQty, step, enforcePack } = getWholesaleQtyRules(product);
  const [draft, setDraft] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(String(value));
    }
  }, [value, isEditing]);

  const commitDraft = (rawText: string) => {
    setIsEditing(false);
    const parsed = parseInt(rawText.trim(), 10);
    if (isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    if (allowZero && parsed <= 0) {
      onChange(0);
      setDraft('0');
      return;
    }
    const snapped = snapWholesaleQty(product, parsed, maxQty);
    onChange(snapped);
    setDraft(String(snapped));
  };

  const handleStep = (direction: 1 | -1) => {
    if (disabled) return;
    if (allowZero && direction === -1 && value <= minQty) {
      onChange(0);
      return;
    }
    const next = stepWholesaleQty(product, value, direction, maxQty);
    onChange(next);
  };

  const atMin = !allowZero && value <= minQty;
  const atMax = typeof maxQty === 'number' && value >= maxQty;

  return (
    <div className={wrapperClassName} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => handleStep(-1)}
        disabled={disabled || atMin}
        aria-label="Decrease quantity"
        title={
          atMin
            ? `Minimum order is ${minQty}${enforcePack ? ` (pack of ${step})` : ''}`
            : enforcePack
              ? `Decrease by ${step} (1 carton)`
              : 'Decrease quantity'
        }
      >
        <Minus size={iconSize} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        className={inputClassName}
        value={isEditing ? draft : String(value)}
        onFocus={(e) => {
          setIsEditing(true);
          setDraft(String(value));
          e.target.select();
        }}
        onChange={(e) => {
          const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
          setDraft(digitsOnly);
        }}
        onBlur={() => commitDraft(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitDraft(draft);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            setIsEditing(false);
            setDraft(String(value));
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label={`Quantity for ${product.n}`}
      />
      <button
        type="button"
        className={buttonClassName}
        onClick={() => handleStep(1)}
        disabled={disabled || atMax}
        aria-label="Increase quantity"
        title={enforcePack ? `Increase by ${step} (1 carton)` : 'Increase quantity'}
      >
        <Plus size={iconSize} />
      </button>
    </div>
  );
}
