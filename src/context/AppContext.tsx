'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Product, PRODUCTS } from '@/data/products';

export interface User {
  name: string;
}

export interface Vehicle {
  b: string; // brand
  m: string; // model
  y: string; // year
  f: string; // fuel
}

export interface Order {
  id: number;
  items: [number, number][]; // [productId, qty][]
  total: number;
  pay: string;
  date: string;
  eta: string;
}

interface AppContextType {
  user: User | null;
  car: Vehicle | null;
  cart: Record<number, number>;
  cartCount: number;
  cartSubtotal: number;
  fav: number[];
  orders: Order[];
  isCartOpen: boolean;
  isMobileMenuOpen: boolean;
  quickViewProduct: Product | null;
  toastMessage: string | null;
  login: (name?: string) => void;
  logout: () => void;
  setVehicle: (v: Vehicle) => void;
  addToCart: (productId: number, qty?: number) => void;
  updateCartQty: (productId: number, delta: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  toggleFav: (productId: number) => void;
  isFav: (productId: number) => boolean;
  openCart: () => void;
  closeCart: () => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  openQuickView: (p: Product) => void;
  closeQuickView: () => void;
  showToast: (msg: string) => void;
  placeOrder: (order: Order) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [car, setCar] = useState<Vehicle | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [fav, setFav] = useState<number[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('cx_user');
      if (savedUser) setUser(JSON.parse(savedUser));

      const savedCar = localStorage.getItem('cx_car');
      if (savedCar) setCar(JSON.parse(savedCar));

      const savedCart = localStorage.getItem('cx_cart');
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedFav = localStorage.getItem('cx_fav');
      if (savedFav) setFav(JSON.parse(savedFav));

      const savedOrders = localStorage.getItem('cx_orders');
      if (savedOrders) setOrders(JSON.parse(savedOrders));
    } catch (e) {
      console.error('Storage access error', e);
    }
    setIsLoaded(true);
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (user) localStorage.setItem('cx_user', JSON.stringify(user));
      else localStorage.removeItem('cx_user');
    } catch (e) {}
  }, [user, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (car) localStorage.setItem('cx_car', JSON.stringify(car));
      else localStorage.removeItem('cx_car');
    } catch (e) {}
  }, [car, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('cx_cart', JSON.stringify(cart));
    } catch (e) {}
  }, [cart, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('cx_fav', JSON.stringify(fav));
    } catch (e) {}
  }, [fav, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('cx_orders', JSON.stringify(orders));
    } catch (e) {}
  }, [orders, isLoaded]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const login = (name?: string) => {
    const newUser = { name: name || 'Driver' };
    setUser(newUser);
    showToast('Signed in — demo account');
  };

  const logout = () => {
    setUser(null);
    showToast('Signed out');
  };

  const setVehicle = (v: Vehicle) => {
    setCar(v);
    showToast(`Garage set — ${v.y} ${v.b} ${v.m}`);
  };

  const addToCart = (productId: number, qty = 1) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      return { ...prev, [productId]: current + qty };
    });
    const p = PRODUCTS.find((x) => x.id === productId);
    if (p) showToast(`Added to cart — ${p.n}`);
  };

  const updateCartQty = (productId: number, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    const p = PRODUCTS.find((x) => x.id === productId);
    if (p) showToast(`Removed from cart — ${p.n}`);
  };

  const clearCart = () => {
    setCart({});
  };

  const toggleFav = (productId: number) => {
    setFav((prev) => {
      const exists = prev.includes(productId);
      const p = PRODUCTS.find((x) => x.id === productId);
      if (exists) {
        if (p) showToast(`Removed from favourites — ${p.n}`);
        return prev.filter((id) => id !== productId);
      } else {
        if (p) showToast(`Saved to favourites — ${p.n}`);
        return [...prev, productId];
      }
    });
  };

  const isFav = (productId: number) => fav.includes(productId);

  const openCart = () => {
    setIsCartOpen(true);
    document.body.classList.add('lock');
  };

  const closeCart = () => {
    setIsCartOpen(false);
    if (!quickViewProduct && !isMobileMenuOpen) {
      document.body.classList.remove('lock');
    }
  };

  const openMobileMenu = () => {
    setIsMobileMenuOpen(true);
    document.body.classList.add('lock');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    if (!isCartOpen && !quickViewProduct) {
      document.body.classList.remove('lock');
    }
  };

  const openQuickView = (p: Product) => {
    setQuickViewProduct(p);
    document.body.classList.add('lock');
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
    if (!isCartOpen && !isMobileMenuOpen) {
      document.body.classList.remove('lock');
    }
  };

  const placeOrder = (order: Order) => {
    setOrders((prev) => [...prev, order]);
    clearCart();
  };

  const cartCount = useMemo(() => {
    return Object.values(cart).reduce((a, b) => a + b, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return Object.entries(cart).reduce((total, [idStr, qty]) => {
      const p = PRODUCTS.find((x) => x.id === Number(idStr));
      return total + (p ? p.p * qty : 0);
    }, 0);
  }, [cart]);

  return (
    <AppContext.Provider
      value={{
        user,
        car,
        cart,
        cartCount,
        cartSubtotal,
        fav,
        orders,
        isCartOpen,
        isMobileMenuOpen,
        quickViewProduct,
        toastMessage,
        login,
        logout,
        setVehicle,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        toggleFav,
        isFav,
        openCart,
        closeCart,
        openMobileMenu,
        closeMobileMenu,
        openQuickView,
        closeQuickView,
        showToast,
        placeOrder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
