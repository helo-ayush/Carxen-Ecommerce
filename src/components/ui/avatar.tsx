import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
}

export function Avatar({ className, src, alt, fallback, children, style, ...props }: AvatarProps) {
  const [imageError, setImageError] = React.useState(!src);

  return (
    <div
      className={cn(
        'relative flex shrink-0 overflow-hidden bg-[#f4f3ef] border border-[#eaeaec]',
        className
      )}
      style={{
        borderRadius: '50%',
        overflow: 'hidden',
        aspectRatio: '1 / 1',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
      {...props}
    >
      {src && !imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || ''}
          onError={() => setImageError(true)}
          style={{
            borderRadius: '50%',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <span
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#5d5d64',
            borderRadius: '50%',
          }}
        >
          {fallback || alt?.slice(0, 2) || children || 'U'}
        </span>
      )}
    </div>
  );
}
