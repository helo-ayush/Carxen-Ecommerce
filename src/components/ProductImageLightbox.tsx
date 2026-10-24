'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Car,
  Gauge,
  Sparkles,
  Shield,
  Compass,
  Move,
} from 'lucide-react';
import './storefront/cx-lightbox.css';

export interface LightboxImageItem {
  url: string;
  title: string;
  badge?: string;
  icon?: string;
}

export interface ProductImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: LightboxImageItem[];
  activeIndex: number;
  onIndexChange: (idx: number) => void;
  productName: string;
  categoryLabel?: string;
  colorName?: string;
  colorFilter?: string;
}

export function ProductImageLightbox({
  isOpen,
  onClose,
  images,
  activeIndex,
  onIndexChange,
  productName,
  categoryLabel,
  colorName,
  colorFilter,
}: ProductImageLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageFrameRef = useRef<HTMLDivElement>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Touch swipe support
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentImage = images[activeIndex] || images[0];

  // Reset zoom & pan when image changes or modal closes
  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetZoom();
  }, [activeIndex, resetZoom]);

  useEffect(() => {
    if (!isOpen) {
      resetZoom();
    }
  }, [isOpen, resetZoom]);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Track native fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(4, +(prev + 0.5).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => {
      const next = Math.max(1, +(prev - 0.5).toFixed(2));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const toggleNativeFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen permission rejections
    }
  };

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    onIndexChange(activeIndex === 0 ? images.length - 1 : activeIndex - 1);
  }, [activeIndex, images.length, onIndexChange]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    onIndexChange(activeIndex === images.length - 1 ? 0 : activeIndex + 1);
  }, [activeIndex, images.length, onIndexChange]);

  // Keyboard navigation & zoom shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomLevel > 1) {
          resetZoom();
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, zoomLevel, resetZoom, onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut]);

  // Mouse wheel zoom
  useEffect(() => {
    const frame = imageFrameRef.current;
    if (!isOpen || !frame) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.25 : -0.25;
      setZoomLevel((prev) => {
        const next = Math.min(4, Math.max(1, +(prev + zoomDelta).toFixed(2)));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    };

    frame.addEventListener('wheel', handleWheel, { passive: false });
    return () => frame.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  // Double click to toggle between 1x and 2.5x
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel > 1) {
      resetZoom();
    } else {
      setZoomLevel(2.5);
      if (imageFrameRef.current) {
        const rect = imageFrameRef.current.getBoundingClientRect();
        const offsetX = (rect.width / 2 - (e.clientX - rect.left)) * 0.8;
        const offsetY = (rect.height / 2 - (e.clientY - rect.top)) * 0.8;
        setPan({ x: offsetX, y: offsetY });
      }
    }
  };

  // Drag pan when zoomed
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || zoomLevel <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch gestures (swipe next/prev when 1x, pan when zoomed)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      if (zoomLevel > 1) {
        setIsDragging(true);
        dragStartRef.current = { x: touch.clientX, y: touch.clientY };
        panStartRef.current = { ...pan };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (zoomLevel > 1 && isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (zoomLevel <= 1 && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 60) {
        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }
    setIsDragging(false);
  };

  const renderBadgeIcon = (iconName?: string) => {
    switch (iconName) {
      case 'gauge':
        return <Gauge size={13} />;
      case 'sparkles':
        return <Sparkles size={13} />;
      case 'shield':
        return <Shield size={13} />;
      case 'compass':
        return <Compass size={13} />;
      default:
        return <Car size={13} />;
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      ref={containerRef}
      className="cx-lightbox-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        backgroundColor: 'rgba(8, 9, 11, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#ffffff',
        overflow: 'hidden',
      }}
      onMouseUp={handleMouseUp}
    >
      {/* TOP HEADER */}
      <header className="cx-lightbox-header">
        {/* Left: Product & Perspective Info */}
        <div className="cx-lightbox-title-area">
          <div className="cx-lightbox-title-col">
            <div className="cx-lightbox-eyebrow">
              <span className="cx-lightbox-eyebrow-tag">
                {categoryLabel || 'CARXEN GALLERY'}
              </span>
              {colorName && (
                <span className="cx-lightbox-color-chip">
                  Color: {colorName}
                </span>
              )}
            </div>
            <h2 className="cx-lightbox-title" title={productName}>
              {productName}
            </h2>
          </div>

          <div className="cx-lightbox-angle-pill">
            {renderBadgeIcon(currentImage?.icon)}
            <span>{currentImage?.title || 'Perspective View'}</span>
          </div>
        </div>

        {/* Right: Interactive Zoom & Fullscreen Toolbar */}
        <div className="cx-lightbox-toolbar">
          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            aria-label="Zoom out"
            className="cx-lightbox-tool-btn"
            title="Zoom out (-)"
          >
            <ZoomOut size={16} />
          </button>

          {/* Current Zoom Level Pill */}
          <button
            type="button"
            onClick={resetZoom}
            className="cx-lightbox-tool-btn cx-lightbox-zoom-pill"
            title="Reset Zoom (0)"
          >
            {Math.round(zoomLevel * 100)}%
          </button>

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 4}
            aria-label="Zoom in"
            className="cx-lightbox-tool-btn"
            title="Zoom in (+)"
          >
            <ZoomIn size={16} />
          </button>

          {/* Reset Zoom */}
          <button
            type="button"
            onClick={resetZoom}
            disabled={zoomLevel === 1 && pan.x === 0 && pan.y === 0}
            aria-label="Reset zoom and position"
            className="cx-lightbox-tool-btn"
            title="Reset (0)"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          {/* Fullscreen API Toggle */}
          <button
            type="button"
            onClick={toggleNativeFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter full screen'}
            className="cx-lightbox-tool-btn"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Close Lightbox */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image viewer"
            className="cx-lightbox-tool-btn cx-lightbox-close-btn"
            title="Close (Esc)"
          >
            <X size={17} />
            <span>Close</span>
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT / STAGE */}
      <main
        className="cx-lightbox-stage"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
        }}
      >
        {/* Navigation Arrow Left */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous angle"
            className="cx-lightbox-nav-arrow left"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Navigation Arrow Right */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next angle"
            className="cx-lightbox-nav-arrow right"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Panning / Zoom Frame */}
        <div
          ref={imageFrameRef}
          onDoubleClick={handleDoubleClick}
          className="cx-lightbox-img-frame"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoomLevel})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImage?.url}
            alt={currentImage?.title || productName}
            className="cx-lightbox-img"
            style={{
              filter: colorFilter && colorFilter !== 'none' ? colorFilter : undefined,
            }}
            draggable={false}
          />
        </div>

        {/* Floating Pan Indicator when Zoomed */}
        {zoomLevel > 1 && (
          <div className="cx-lightbox-pan-hint">
            <Move size={12} />
            <span>Drag image to pan around • Double-click to reset</span>
          </div>
        )}
      </main>

      {/* FOOTER THUMBNAILS & HINTS */}
      <footer className="cx-lightbox-footer">
        {/* Thumbnails Row */}
        <div className="cx-lightbox-thumbs-scroll">
          {images.map((item, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onIndexChange(idx)}
                className={`cx-lightbox-thumb-card ${isActive ? 'active' : ''}`}
                title={item.title}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.title}
                  style={{
                    filter: colorFilter && colorFilter !== 'none' ? colorFilter : undefined,
                  }}
                />
                <div className="thumb-badge">
                  {item.badge || `Angle ${idx + 1}`}
                </div>
              </button>
            );
          })}
        </div>

        {/* User Tip & Perspective counter */}
        <div className="cx-lightbox-tip-bar">
          <div>
            <span>
              Angle {activeIndex + 1} of {images.length}
            </span>
            <span> • </span>
            <span style={{ color: '#ffffff' }}>{currentImage?.title}</span>
          </div>

          <div className="desktop-hint">
            <span>Mouse wheel or + / - to zoom</span>
            <span> • </span>
            <span>Double click to toggle 2.5x</span>
            <span> • </span>
            <span>Left / Right keys to switch</span>
          </div>
        </div>
      </footer>
    </div>
  );

  return createPortal(modalContent, document.body);
}
