'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string;
  showStrength?: boolean;
  inputClassName?: string;
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '#e2e8f0' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8 && (/[0-9]/.test(pw) || /[^a-zA-Z0-9]/.test(pw))) score++;
  if (pw.length >= 10 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score: 2, label: 'Good', color: '#f59e0b' };
  return { score: 3, label: 'Strong', color: '#10b981' };
}

export function PasswordInput({
  error,
  showStrength = false,
  inputClassName = '',
  value,
  style,
  id,
  onKeyUp,
  ...rest
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const strValue = typeof value === 'string' ? value : '';
  const strength = showStrength ? getPasswordStrength(strValue) : null;
  const errorId = id ? `${id}-error` : undefined;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        <input
          {...rest}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          className={inputClassName}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error && errorId ? errorId : undefined}
          style={{
            paddingRight: '40px',
            ...(error ? { borderColor: '#dc2626' } : {}),
            ...style,
          }}
          onKeyUp={(e) => {
            setCapsLock(Boolean(e.getModifierState && e.getModifierState('CapsLock')));
            onKeyUp?.(e);
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          title={visible ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: '#71717a',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
          }}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {capsLock && (
        <div style={{ marginTop: '4px', fontSize: '11px', color: '#d97706', fontWeight: 600 }}>
          Caps Lock is on
        </div>
      )}

      {showStrength && strValue.length > 0 && strength && (
        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', flex: 1, gap: '4px' }}>
            {[1, 2, 3].map((lvl) => (
              <div
                key={lvl}
                style={{
                  height: '3px',
                  flex: 1,
                  borderRadius: '999px',
                  backgroundColor: strength.score >= lvl ? strength.color : '#e2e8f0',
                  transition: 'background-color 0.2s ease',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: strength.color }}>
            {strength.label}
          </span>
        </div>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#dc2626', fontWeight: 500 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
