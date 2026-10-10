'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

export function Toast() {
  const { toastMessage } = useApp();

  return (
    <div className={`toast ${toastMessage ? 'on' : ''}`} id="toast" role="status">
      {toastMessage}
    </div>
  );
}
