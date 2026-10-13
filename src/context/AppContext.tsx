'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Product } from '@/data/products';
import { loadCatalogProducts } from '@/lib/storefront/catalog-client';
import { supabase } from '@/lib/supabase/client';

export type CatalogStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface User {
  id?: string;
  name: string;
  email?: string;
}

export interface Vehicle {
  b: string; // brand
  m: string; // model
  y: string; // year
  f: string; // fuel
}

interface AppContextType {
  products: Product[];
  catalogStatus: CatalogStatus;
  catalogError: string | null;
  retryCatalog: () => void;
  user: User | null;
  car: Vehicle | null;
  cart: Record<number, number>;
  cartCount: number;
  cartSubtotal: number;
  fav: number[];
  isCartOpen: boolean;
  isMobileMenuOpen: boolean;
  quickViewProduct: Product | null;
  toastMessage: string | null;
  login: (name?: string) => void;
  loginWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: string | null; requiresEmailConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>('loading');
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [car, setCar] = useState<Vehicle | null>(null);
  // Pending backend step: the cart remains browser-local until cart sync is added.
  const [cart, setCart] = useState<Record<number, number>>({});
  const [fav, setFav] = useState<number[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const requestCatalog = useCallback(async (signal?: AbortSignal) => {
    setCatalogStatus('loading');
    setCatalogError(null);

    try {
      const response = await loadCatalogProducts(signal);
      if (signal?.aborted) return;

      setProducts(response.products);
      setCatalogStatus(response.products.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) return;

      setProducts([]);
      setCatalogStatus('error');
      setCatalogError(error instanceof Error ? error.message : 'The catalog could not be loaded.');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void requestCatalog(controller.signal);
    return () => controller.abort();
  }, [requestCatalog]);

  const retryCatalog = useCallback(() => {
    void requestCatalog();
  }, [requestCatalog]);

  // Supabase Auth Listener
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession warning:', error.message);
          return;
        }
        if (mounted && data.session?.user) {
          const u = data.session.user;
          const fullName =
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split('@')[0] ||
            'Driver';
          setUser({
            id: u.id,
            name: fullName,
            email: u.email,
          });
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      }
    };

    void initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          const u = session.user;
          const fullName =
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split('@')[0] ||
            'Driver';
          setUser({
            id: u.id,
            name: fullName,
            email: u.email,
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);


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

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        return { error: error.message };
      }
      if (data.user) {
        const fullName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email?.split('@')[0] ||
          'Driver';
        setUser({
          id: data.user.id,
          name: fullName,
          email: data.user.email,
        });
        showToast(`Welcome back, ${fullName}!`);
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Login failed' };
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName?: string
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName?.trim() || 'Driver',
          },
        },
      });
      if (error) {
        return { error: error.message };
      }
      if (data.session && data.user) {
        const name =
          fullName?.trim() || data.user.email?.split('@')[0] || 'Driver';
        setUser({
          id: data.user.id,
          name,
          email: data.user.email,
        });
        showToast(`Account created — Welcome, ${name}!`);
        return { error: null, requiresEmailConfirmation: false };
      }
      return { error: null, requiresEmailConfirmation: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Sign up failed' };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Google sign-in failed',
      };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign out error:', e);
    }
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
    const p = products.find((x) => x.id === productId);
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
    const p = products.find((x) => x.id === productId);
    if (p) showToast(`Removed from cart — ${p.n}`);
  };

  const clearCart = () => {
    setCart({});
  };

  const toggleFav = (productId: number) => {
    setFav((prev) => {
      const exists = prev.includes(productId);
      const p = products.find((x) => x.id === productId);
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

  const cartCount = useMemo(() => {
    return Object.values(cart).reduce((a, b) => a + b, 0);
  }, [cart, products]);

  const cartSubtotal = useMemo(() => {
    return Object.entries(cart).reduce((total, [idStr, qty]) => {
      const p = products.find((x) => x.id === Number(idStr));
      return total + (p ? p.p * qty : 0);
    }, 0);
  }, [cart, products]);

  return (
    <AppContext.Provider
      value={{
        products,
        catalogStatus,
        catalogError,
        retryCatalog,
        user,
        car,
        cart,
        cartCount,
        cartSubtotal,
        fav,
        isCartOpen,
        isMobileMenuOpen,
        quickViewProduct,
        toastMessage,
        login,
      loginWithEmail,
      signUpWithEmail,
      signInWithGoogle,
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
