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
import type {
  CustomerAddress,
  CustomerOrderHistoryRecord,
  SavedPaymentMethod,
  CommunicationPreferences,
  GstBillingInfo,
} from '@/types/customer';
import {
  DEFAULT_CUSTOMER_ADDRESSES,
  DEFAULT_ORDER_HISTORY,
  DEFAULT_SAVED_PAYMENTS,
  DEFAULT_COMMUNICATION_PREFS,
  DEFAULT_GST_INFO,
} from '@/data/customer-defaults';

export type CatalogStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface User {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  joinedDate?: string;
  tier?: string;
  rewardPoints?: number;
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
  authLoading: boolean;
  car: Vehicle | null;
  cart: Record<number, number>;
  cartCount: number;
  cartSubtotal: number;
  fav: number[];
  isCartOpen: boolean;
  isMobileMenuOpen: boolean;
  quickViewProduct: Product | null;
  toastMessage: string | null;
  addresses: CustomerAddress[];
  orders: CustomerOrderHistoryRecord[];
  savedPayments: SavedPaymentMethod[];
  communicationPrefs: CommunicationPreferences;
  gstBilling: GstBillingInfo;
  login: (name?: string) => void;
  loginWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: string | null; requiresEmailConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateUserProfile: (profile: Partial<User>) => Promise<void>;
  addAddress: (addr: Omit<CustomerAddress, 'id'>) => void;
  updateAddress: (id: string, addr: Partial<CustomerAddress>) => void;
  deleteAddress: (id: string) => void;
  setPrimaryAddress: (id: string) => void;
  saveOrderToHistory: (order: CustomerOrderHistoryRecord) => void;
  addSavedPayment: (pm: Omit<SavedPaymentMethod, 'id'>) => void;
  deleteSavedPayment: (id: string) => void;
  setDefaultPayment: (id: string) => void;
  updateCommunicationPrefs: (prefs: Partial<CommunicationPreferences>) => void;
  updateGstBilling: (info: Partial<GstBillingInfo>) => void;
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
  const [authLoading, setAuthLoading] = useState(true);
  const [car, setCar] = useState<Vehicle | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [fav, setFav] = useState<number[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Customer detailed state
  const [addresses, setAddresses] = useState<CustomerAddress[]>(DEFAULT_CUSTOMER_ADDRESSES);
  const [orders, setOrders] = useState<CustomerOrderHistoryRecord[]>(DEFAULT_ORDER_HISTORY);
  const [savedPayments, setSavedPayments] = useState<SavedPaymentMethod[]>(DEFAULT_SAVED_PAYMENTS);
  const [communicationPrefs, setCommunicationPrefs] = useState<CommunicationPreferences>(DEFAULT_COMMUNICATION_PREFS);
  const [gstBilling, setGstBilling] = useState<GstBillingInfo>(DEFAULT_GST_INFO);

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

  // Helper to construct user with local overrides
  const constructUserFromSession = (u: any): User => {
    let localProfile: Partial<User> = {};
    try {
      const cached = localStorage.getItem('cx_user_profile');
      if (cached) localProfile = JSON.parse(cached);
    } catch {}

    const fullName =
      localProfile.name ||
      u.user_metadata?.full_name ||
      u.user_metadata?.name ||
      u.email?.split('@')[0] ||
      'Driver';

    return {
      id: u.id,
      name: fullName,
      email: u.email,
      phone: localProfile.phone || u.user_metadata?.phone || u.phone || '+91 98201 44829',
      avatarUrl: localProfile.avatarUrl || u.user_metadata?.avatar_url || '',
      joinedDate: localProfile.joinedDate || (u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Oct 2024'),
      tier: localProfile.tier || 'Apex Gold Member',
      rewardPoints: localProfile.rewardPoints ?? 1450,
    };
  };

  // Supabase Auth Listener
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession warning:', error.message);
          if (mounted) {
            // Check for locally persisted active demo user
            try {
              const cached = localStorage.getItem('cx_demo_user');
              if (cached) {
                setUser(JSON.parse(cached));
              } else {
                setUser(null);
              }
            } catch {
              setUser(null);
            }
            setAuthLoading(false);
          }
          return;
        }
        if (mounted) {
          if (data.session?.user) {
            setUser(constructUserFromSession(data.session.user));
          } else {
            try {
              const cached = localStorage.getItem('cx_demo_user');
              if (cached) {
                setUser(JSON.parse(cached));
              } else {
                setUser(null);
              }
            } catch {
              setUser(null);
            }
          }
          setAuthLoading(false);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setUser(null);
          setAuthLoading(false);
        }
      }
    };

    void initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(constructUserFromSession(session.user));
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          try {
            localStorage.removeItem('cx_demo_user');
          } catch {}
        }
        setAuthLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Initialize browser-local preferences and customer data
  useEffect(() => {
    try {
      const savedCar = localStorage.getItem('cx_car');
      if (savedCar) setCar(JSON.parse(savedCar));

      const savedCart = localStorage.getItem('cx_cart');
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedFav = localStorage.getItem('cx_fav');
      if (savedFav) setFav(JSON.parse(savedFav));

      const savedAddresses = localStorage.getItem('cx_addresses');
      if (savedAddresses) {
        const parsed = JSON.parse(savedAddresses);
        if (Array.isArray(parsed) && parsed.length > 0) setAddresses(parsed);
      }

      const savedOrders = localStorage.getItem('cx_order_history');
      if (savedOrders) {
        const parsed = JSON.parse(savedOrders);
        if (Array.isArray(parsed) && parsed.length > 0) setOrders(parsed);
      }

      const savedPm = localStorage.getItem('cx_saved_payments');
      if (savedPm) {
        const parsed = JSON.parse(savedPm);
        if (Array.isArray(parsed) && parsed.length > 0) setSavedPayments(parsed);
      }

      const savedPrefs = localStorage.getItem('cx_communication_prefs');
      if (savedPrefs) setCommunicationPrefs(JSON.parse(savedPrefs));

      const savedGst = localStorage.getItem('cx_gst_billing');
      if (savedGst) setGstBilling(JSON.parse(savedGst));
    } catch (e) {
      console.error('Storage access error', e);
    }
    setIsLoaded(true);
  }, []);

  // Persist preferences
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
      localStorage.setItem('cx_addresses', JSON.stringify(addresses));
    } catch (e) {}
  }, [addresses, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('cx_order_history', JSON.stringify(orders));
    } catch (e) {}
  }, [orders, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('cx_saved_payments', JSON.stringify(savedPayments));
    } catch (e) {}
  }, [savedPayments, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('cx_communication_prefs', JSON.stringify(communicationPrefs));
    } catch (e) {}
  }, [communicationPrefs, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('cx_gst_billing', JSON.stringify(gstBilling));
    } catch (e) {}
  }, [gstBilling, isLoaded]);

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
    const demoUser: User = {
      name: name || 'Aarav Sharma',
      email: 'aarav.speed@carxen.io',
      phone: '+91 98201 44829',
      avatarUrl: '',
      joinedDate: 'Oct 2024',
      tier: 'Apex Gold Member',
      rewardPoints: 1450,
    };
    setUser(demoUser);
    try {
      localStorage.setItem('cx_demo_user', JSON.stringify(demoUser));
    } catch {}
    showToast(`Signed in as ${demoUser.name}`);
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
        const constructed = constructUserFromSession(data.user);
        setUser(constructed);
        showToast(`Welcome back, ${constructed.name}!`);
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
      const resp = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          fullName: fullName?.trim() || 'Driver',
        }),
      });

      const result = await resp.json();
      if (!resp.ok) {
        return { error: result.error || 'Account creation failed' };
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        return {
          error: null,
          requiresEmailConfirmation: false,
        };
      }

      if (signInData.user) {
        const constructed = constructUserFromSession(signInData.user);
        setUser(constructed);
        showToast(`Welcome to CARXEN, ${constructed.name}!`);
      }

      return { error: null, requiresEmailConfirmation: false };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Sign up failed' };
    }
  };

  const signInWithGoogle = async () => {
    showToast('Google Sign-In will be available soon.');
    return {
      error: 'Google Sign-In will be available soon. Please use email and password to sign in.',
    };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign out error:', e);
    }
    setUser(null);
    try {
      localStorage.removeItem('cx_demo_user');
      localStorage.removeItem('cx_user');
    } catch (e) {}
    showToast('Signed out successfully');
  };

  const updateUserProfile = async (profileUpdates: Partial<User>) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...profileUpdates } : ({ name: 'Driver', ...profileUpdates } as User);
      try {
        localStorage.setItem('cx_user_profile', JSON.stringify(next));
        if (localStorage.getItem('cx_demo_user')) {
          localStorage.setItem('cx_demo_user', JSON.stringify(next));
        }
      } catch {}
      return next;
    });

    if (user?.id) {
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: profileUpdates.name ?? user.name,
            phone: profileUpdates.phone ?? user.phone,
            avatar_url: profileUpdates.avatarUrl ?? user.avatarUrl,
          },
        });
      } catch (err) {
        console.warn('Could not sync user profile with Supabase auth:', err);
      }
    }
    showToast('Profile updated successfully');
  };

  // Address CRUD
  const addAddress = (addr: Omit<CustomerAddress, 'id'>) => {
    const newId = `addr_${Date.now()}`;
    setAddresses((prev) => {
      let updated = prev;
      if (addr.isPrimary || prev.length === 0) {
        updated = prev.map((a) => ({ ...a, isPrimary: false }));
      }
      return [{ id: newId, ...addr, isPrimary: addr.isPrimary || prev.length === 0 }, ...updated];
    });
    showToast('Address added to your account');
  };

  const updateAddress = (id: string, updates: Partial<CustomerAddress>) => {
    setAddresses((prev) => {
      let updated = prev;
      if (updates.isPrimary) {
        updated = prev.map((a) => (a.id === id ? { ...a, ...updates } : { ...a, isPrimary: false }));
      } else {
        updated = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
      }
      return updated;
    });
    showToast('Address updated');
  };

  const deleteAddress = (id: string) => {
    setAddresses((prev) => {
      const target = prev.find((a) => a.id === id);
      const remaining = prev.filter((a) => a.id !== id);
      if (target?.isPrimary && remaining.length > 0) {
        remaining[0].isPrimary = true;
      }
      return remaining;
    });
    showToast('Address removed');
  };

  const setPrimaryAddress = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isPrimary: a.id === id,
      }))
    );
    showToast('Primary delivery address updated');
  };

  // Orders
  const saveOrderToHistory = (order: CustomerOrderHistoryRecord) => {
    setOrders((prev) => [order, ...prev.filter((o) => o.orderNumber !== order.orderNumber)]);
  };

  // Saved Payment Methods CRUD
  const addSavedPayment = (pm: Omit<SavedPaymentMethod, 'id'>) => {
    const newId = `pm_${Date.now()}`;
    setSavedPayments((prev) => {
      let updated = prev;
      if (pm.isDefault || prev.length === 0) {
        updated = prev.map((p) => ({ ...p, isDefault: false }));
      }
      return [{ id: newId, ...pm, isDefault: pm.isDefault || prev.length === 0 }, ...updated];
    });
    showToast('Payment method saved');
  };

  const deleteSavedPayment = (id: string) => {
    setSavedPayments((prev) => {
      const target = prev.find((p) => p.id === id);
      const remaining = prev.filter((p) => p.id !== id);
      if (target?.isDefault && remaining.length > 0) {
        remaining[0].isDefault = true;
      }
      return remaining;
    });
    showToast('Payment method removed');
  };

  const setDefaultPayment = (id: string) => {
    setSavedPayments((prev) =>
      prev.map((p) => ({
        ...p,
        isDefault: p.id === id,
      }))
    );
    showToast('Default payment method set');
  };

  const updateCommunicationPrefs = (prefs: Partial<CommunicationPreferences>) => {
    setCommunicationPrefs((prev) => ({ ...prev, ...prefs }));
    showToast('Preferences updated');
  };

  const updateGstBilling = (info: Partial<GstBillingInfo>) => {
    setGstBilling((prev) => ({ ...prev, ...info }));
    showToast('GST billing preferences saved');
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
  }, [cart]);

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
        authLoading,
        car,
        cart,
        cartCount,
        cartSubtotal,
        fav,
        isCartOpen,
        isMobileMenuOpen,
        quickViewProduct,
        toastMessage,
        addresses,
        orders,
        savedPayments,
        communicationPrefs,
        gstBilling,
        login,
        loginWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        logout,
        updateUserProfile,
        addAddress,
        updateAddress,
        deleteAddress,
        setPrimaryAddress,
        saveOrderToHistory,
        addSavedPayment,
        deleteSavedPayment,
        setDefaultPayment,
        updateCommunicationPrefs,
        updateGstBilling,
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
