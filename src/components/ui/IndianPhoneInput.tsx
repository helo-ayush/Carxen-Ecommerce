'use client';

import React from 'react';

export interface IndianPhoneInputProps {
  value: string;
  onChange: (tenDigitPhone: string) => void;
  onBlur?: () => void;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  error?: string;
  showCounter?: boolean;
}

/**
 * Extracts strictly the 10-digit Indian subscriber number.
 * Only strips leading `91` or `0` when the pasted/initial string has > 10 digits,
 * preventing an 8-digit number typed after `+91` from falsely counting `91` as 2 digits.
 */
export function extractTenDigitIndianPhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length > 10 && digits.startsWith('91')) return digits.slice(2, 12);
  return digits.slice(0, 10);
}

export function isValidIndianMobile10(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

export function IndianPhoneInput({
  value,
  onChange,
  onBlur,
  id,
  required = false,
  disabled = false,
  placeholder = '98765 43210',
  className = '',
  style,
  error,
  showCounter = true,
}: IndianPhoneInputProps) {
  const cleanDigits = extractTenDigitIndianPhone(value);
  const count = cleanDigits.length;
  const isValid = isValidIndianMobile10(cleanDigits);
  const startsInvalid = count > 0 && !/^[6-9]/.test(cleanDigits);
  const errorId = id ? `${id}-error` : undefined;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          width: '100%',
          borderRadius: '8px',
          border: `1px solid ${error || startsInvalid ? '#dc2626' : isValid ? '#16a34a' : '#d4d4d8'}`,
          backgroundColor: disabled ? '#f4f4f5' : '#ffffff',
          overflow: 'hidden',
          ...style,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '0 10px',
            backgroundColor: '#f8fafc',
            borderRight: '1px solid #e2e8f0',
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#334155',
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          <span>🇮🇳</span>
          <span>+91</span>
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={12}
          required={required}
          disabled={disabled}
          value={cleanDigits}
          placeholder={placeholder}
          className={className}
          aria-invalid={Boolean(error || startsInvalid) || undefined}
          aria-describedby={error && errorId ? errorId : undefined}
          style={{
            border: 'none',
            outline: 'none',
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            padding: '9px 12px',
            fontSize: '13.5px',
            letterSpacing: '0.03em',
          }}
          onChange={(e) => {
            const next = extractTenDigitIndianPhone(e.target.value);
            onChange(next);
          }}
          onBlur={onBlur}
        />
        {showCounter && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              paddingRight: '10px',
              fontSize: '11px',
              fontWeight: 700,
              color: isValid ? '#16a34a' : startsInvalid ? '#dc2626' : '#64748b',
              flexShrink: 0,
            }}
          >
            {count}/10
          </span>
        )}
      </div>

      {startsInvalid ? (
        <p role="alert" style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#dc2626', fontWeight: 500 }}>
          Indian mobile numbers must start with 6, 7, 8, or 9
        </p>
      ) : isValid ? (
        <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#16a34a', fontWeight: 600 }}>
          ✓ Valid 10-digit mobile number
        </p>
      ) : error ? (
        <p id={errorId} role="alert" style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#dc2626', fontWeight: 500 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
