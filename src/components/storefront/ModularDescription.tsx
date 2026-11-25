import React from 'react';
import type { DescriptionBlock } from '@/data/products';

function renderStructuredText(body?: string, bullets?: string[]) {
  const paragraphs = (body || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const cleanBullets = (bullets ?? []).map((b) => b.trim()).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', lineHeight: 1.7, color: 'var(--steel, #5d5d64)' }}>
      {paragraphs.map((p, i) => (
        <p key={i} style={{ margin: 0 }}>
          {p}
        </p>
      ))}
      {cleanBullets.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {cleanBullets.map((b, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingLeft: '2px' }}>
              <span
                style={{
                  marginTop: '9px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '999px',
                  backgroundColor: 'var(--red, #e2231a)',
                  flexShrink: 0,
                }}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ModularDescription({
  blocks,
  fallbackDescription,
}: {
  blocks?: DescriptionBlock[];
  fallbackDescription?: string;
}) {
  const cleanFallback = (fallbackDescription || '')
    .replace(/Full of Corona Virus/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!Array.isArray(blocks) || blocks.length === 0) {
    if (!cleanFallback) {
      return (
        <p style={{ fontSize: '13.5px', lineHeight: '1.7', color: 'var(--steel, #5d5d64)' }}>
          No description has been published for this item yet.
        </p>
      );
    }
    return (
      <p style={{ fontSize: '13.5px', lineHeight: '1.7', color: 'var(--steel, #5d5d64)' }}>
        {cleanFallback}
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {cleanFallback && (
        <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--steel, #5d5d64)', margin: 0 }}>
          {cleanFallback}
        </p>
      )}

      {blocks.map((block) => {
        if (block.type === 'image') {
          if (!block.url) return null;
          return (
            <figure key={block.id} style={{ margin: 0 }}>
              <img
                src={block.url}
                alt={block.alt || block.caption || 'Product visual'}
                style={{
                  width: '100%',
                  maxHeight: '440px',
                  objectFit: 'cover',
                  borderRadius: '14px',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  display: 'block',
                }}
              />
              {block.caption && (
                <figcaption
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: 'var(--steel, #5d5d64)',
                    textAlign: 'center',
                    fontStyle: 'italic',
                  }}
                >
                  {block.caption}
                </figcaption>
              )}
            </figure>
          );
        }

        if (block.type === 'text') {
          return (
            <div key={block.id} style={{ maxWidth: '820px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {block.heading && (
                <h4
                  style={{
                    margin: 0,
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--ink, #0e0e0f)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {block.heading}
                </h4>
              )}
              {(block.body || (block.bullets && block.bullets.length > 0)) &&
                renderStructuredText(block.body, block.bullets)}
            </div>
          );
        }

        const isImageRight = block.layout === 'image-right';
        return (
          <div
            key={block.id}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px',
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.02)',
              border: '1px solid rgba(15, 23, 42, 0.06)',
              borderRadius: '14px',
              padding: '18px',
            }}
          >
            <div style={{ order: isImageRight ? 2 : 1 }}>
              {block.imageUrl ? (
                <img
                  src={block.imageUrl}
                  alt={block.heading || 'Feature visual'}
                  style={{
                    width: '100%',
                    maxHeight: '300px',
                    objectFit: 'cover',
                    borderRadius: '10px',
                    display: 'block',
                  }}
                />
              ) : null}
            </div>
            <div style={{ order: isImageRight ? 1 : 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {block.heading && (
                <h4
                  style={{
                    margin: 0,
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--ink, #0e0e0f)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {block.heading}
                </h4>
              )}
              {(block.body || (block.bullets && block.bullets.length > 0)) &&
                renderStructuredText(block.body, block.bullets)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
