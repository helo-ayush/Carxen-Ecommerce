import React from 'react';

export default function ProductLoading() {
  return (
    <div className="ps-page-wrapper" aria-busy="true" aria-label="Loading product">
      <div className="ps-inner-wrap" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
          <div className="lg:col-span-7 space-y-4">
            <div className="aspect-[4/3] w-full rounded-2xl bg-[#ecebe6]" />
            <div className="flex gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 w-20 rounded-xl bg-[#ecebe6]" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-5 space-y-4 pt-2">
            <div className="h-4 w-32 rounded bg-[#ecebe6]" />
            <div className="h-8 w-5/6 rounded bg-[#ecebe6]" />
            <div className="h-6 w-1/3 rounded bg-[#ecebe6]" />
            <div className="h-24 w-full rounded-xl bg-[#ecebe6]" />
            <div className="flex gap-3 pt-2">
              <div className="h-12 flex-1 rounded-xl bg-[#ecebe6]" />
              <div className="h-12 flex-1 rounded-xl bg-[#ecebe6]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
