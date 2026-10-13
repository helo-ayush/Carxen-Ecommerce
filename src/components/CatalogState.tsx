import React from 'react';
import type { CatalogStatus } from '@/context/AppContext';

interface CatalogStateProps {
  status: CatalogStatus;
  error?: string | null;
  onRetry?: () => void;
  title?: string;
  message?: string;
}

export function CatalogState({
  status,
  error,
  onRetry,
  title,
  message,
}: CatalogStateProps) {
  if (status === 'ready') return null;

  const isLoading = status === 'loading';
  const isError = status === 'error';
  const defaultTitle = isLoading
    ? 'Loading products'
    : isError
    ? 'Catalog unavailable'
    : 'No products available';
  const defaultMessage = isLoading
    ? 'Connecting to the storefront catalog.'
    : isError
    ? error || 'The catalog could not be loaded.'
    : 'There are no published products for this storefront yet.';

  return (
    <div className="empty on" role={isError ? 'alert' : 'status'}>
      <b>{title || defaultTitle}</b>
      {message || defaultMessage}
      {isError && onRetry ? (
        <>
          <br />
          <br />
          <button className="btn dark" type="button" onClick={onRetry}>
            Try again
          </button>
        </>
      ) : null}
    </div>
  );
}
