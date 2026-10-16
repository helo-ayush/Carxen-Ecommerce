'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemName?: string;
  className?: string;
  scrollTargetId?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemName = 'products',
  className = '',
  scrollTargetId,
}: PaginationProps) {
  if (totalItems === 0 || totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handleSelectPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);

    if (scrollTargetId) {
      setTimeout(() => {
        const el = document.getElementById(scrollTargetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  // Generate page numbers with smart ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        '...',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      '...',
      currentPage - 1,
      currentPage,
      currentPage + 1,
      '...',
      totalPages,
    ];
  };

  const pages = getPageNumbers();

  return (
    <div className={`cx-pagination-container ${className}`}>
      <div className="cx-pagination-bar">
        <div className="cx-pagination-info">
          Showing <b>{startItem} – {endItem}</b> of <b>{totalItems}</b> {itemName}
        </div>

        <div className="cx-pagination-controls" role="navigation" aria-label="Pagination Navigation">
          <button
            type="button"
            className="cx-page-btn cx-page-prev"
            disabled={currentPage <= 1}
            onClick={() => handleSelectPage(currentPage - 1)}
            aria-label="Previous Page"
          >
            <ChevronLeft size={15} />
            <span>Prev</span>
          </button>

          <div className="cx-page-numbers-wrap" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
            {pages.map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="cx-page-ellipsis" aria-hidden="true">
                    …
                  </span>
                );
              }
              const pageNum = Number(p);
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  className={`cx-page-btn cx-page-num ${isActive ? 'cx-page-active' : ''}`}
                  onClick={() => handleSelectPage(pageNum)}
                  aria-label={`Go to page ${pageNum}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="cx-page-btn cx-page-next"
            disabled={currentPage >= totalPages}
            onClick={() => handleSelectPage(currentPage + 1)}
            aria-label="Next Page"
          >
            <span>Next</span>
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="cx-pagination-quick">
          Page {currentPage} of {totalPages}
        </div>
      </div>
    </div>
  );
}

export default Pagination;
