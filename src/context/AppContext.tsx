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
import { getEffectiveWholesaleUnitPrice, calculateItemPriceWithOfferLimit } from '@/lib/storefront/wholesale-pricing';
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
import type { StorefrontCoupon } from '@/lib/storefront/coupons';
import { formatUserFriendlyB2BError } from '@/lib/format-b2b-error';

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

export interface GarageVehicle {
  id: string;
  b: string; // brand
  m: string; // model
  y: string; // year
  f: string; // fuel
  nickname?: string;
  isDefault?: boolean;
}

export interface B2BProfile {
  status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'INQUIRY';
  businessName?: string;
  tradeName?: string;
  gstin?: string;
  pan?: string;
  businessType?: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  expectedMonthlyVolume?: string;
  wholesaleTier?: 'tier1' | 'tier2';
  rejectionReason?: string;
  inquiryMessage?: string;
  appliedAt?: string;
  referenceNumber?: string;
}

export const DEFAULT_GARAGE_VEHICLES: GarageVehicle[] = [
  { id: 'veh-1', b: 'Porsche', m: '911 GT3 (992)', y: '2023', f: 'Petrol', isDefault: true },
  { id: 'veh-2', b: 'BMW', m: 'M3 Competition', y: '2024', f: 'Petrol' },
  { id: 'veh-3', b: 'Toyota', m: 'GR Supra 3.0', y: '2022', f: 'Petrol' },
];

interface AppContextType {
  products: Product[];
  storeSettings: Record<string, any> | null;
  storefrontConfig: any | null;
  catalogStatus: CatalogStatus;
  catalogError: string | null;
  retryCatalog: () => void;
  user: User | null;
  authLoading: boolean;
  car: Vehicle | null;
  garageVehicles: GarageVehicle[];
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
  signInWithGoogle: (redirectTarget?: string) => Promise<{ error: string | null }>;
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
  addGarageVehicle: (v: Omit<GarageVehicle, 'id'>) => Promise<GarageVehicle>;
  updateGarageVehicle: (v: GarageVehicle) => Promise<void>;
  deleteGarageVehicle: (id: string) => Promise<void>;
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
  isVerifiedBuyer: boolean;
  totalProductsBought: number;
  b2bProfile: B2BProfile | null;
  isWholesaleApproved: boolean;
  isWholesalePending: boolean;
  isWholesaleInquiry: boolean;
  applyForWholesale: (data: any) => Promise<{ success: boolean; error?: string }>;
  updateB2bProfile: (updates: Partial<B2BProfile> & { name?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  refreshCustomerProfile: () => Promise<void>;
  coupons: StorefrontCoupon[];
  refreshCoupons: () => Promise<void>;
  workspaceMode: 'retail' | 'wholesale';
  setWorkspaceMode: (mode: 'retail' | 'wholesale') => void;
  wholesaleBasket: Record<number, number>;
  wholesaleBasketCount: number;
  wholesaleBasketSkuCount: number;
  wholesaleBasketSubtotal: number;
  addToWholesaleBasket: (productId: number, qty?: number) => void;
  updateWholesaleBasketQty: (productId: number, qty: number) => void;
  removeFromWholesaleBasket: (productId: number) => void;
  clearWholesaleBasket: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [storeSettings, setStoreSettings] = useState<Record<string, any> | null>(null);
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
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [orders, setOrders] = useState<CustomerOrderHistoryRecord[]>([]);
  const [savedPayments, setSavedPayments] = useState<SavedPaymentMethod[]>(DEFAULT_SAVED_PAYMENTS);
  const [communicationPrefs, setCommunicationPrefs] = useState<CommunicationPreferences>(DEFAULT_COMMUNICATION_PREFS);
  const [gstBilling, setGstBilling] = useState<GstBillingInfo>(DEFAULT_GST_INFO);
  const [garageVehicles, setGarageVehicles] = useState<GarageVehicle[]>(DEFAULT_GARAGE_VEHICLES);
  const [b2bProfile, setB2bProfile] = useState<B2BProfile | null>(null);
  const [workspaceMode, setWorkspaceModeState] = useState<'retail' | 'wholesale'>('retail');
  const [wholesaleBasket, setWholesaleBasket] = useState<Record<number, number>>({});

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('cx_workspace_mode');
      if (savedMode === 'wholesale' || savedMode === 'retail') {
        setWorkspaceModeState(savedMode);
      }
      const savedBasket = localStorage.getItem('cx_wholesale_basket');
      if (savedBasket) {
        setWholesaleBasket(JSON.parse(savedBasket));
      }
      const savedB2b = localStorage.getItem('cx_b2b_profile');
      if (savedB2b) {
        setB2bProfile(JSON.parse(savedB2b));
      }
    } catch {}
  }, []);

  const isWholesaleApproved = b2bProfile?.status === 'APPROVED';
  const isWholesalePending = b2bProfile?.status === 'PENDING';
  const isWholesaleInquiry = b2bProfile?.status === 'INQUIRY';

  const [coupons, setCoupons] = useState<StorefrontCoupon[]>([]);

  const refreshCoupons = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront/coupons');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.coupons)) {
          setCoupons(data.coupons);
        }
      }
    } catch (err) {
      console.error('Failed to load storefront coupons:', err);
    }
  }, []);

  useEffect(() => {
    void refreshCoupons();
  }, [refreshCoupons]);

  const requestCatalog = useCallback(async (signal?: AbortSignal) => {
    setCatalogStatus('loading');
    setCatalogError(null);

    try {
      const response = await loadCatalogProducts(signal);
      if (signal?.aborted) return;

      setProducts(response.products);
      if (response.store && (response.store as any).settings) {
        setStoreSettings((response.store as any).settings);
      }
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
      phone: localProfile.phone || u.user_metadata?.phone || u.phone || '',
      avatarUrl: localProfile.avatarUrl || u.user_metadata?.avatar_url || '',
      joinedDate: localProfile.joinedDate || (u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Oct 2024'),
      tier: localProfile.tier && localProfile.tier !== 'Apex Gold Member' ? localProfile.tier : undefined,
      rewardPoints: localProfile.rewardPoints ?? 250,
    };
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
      }
    } catch {}
    if (user?.id) headers['x-demo-user-id'] = user.id;
    if (user?.email) headers['x-demo-user-email'] = user.email;
    return headers;
  };

  const fetchCustomerBackendProfile = async (sessionToken?: string, u?: any) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      const activeId = u?.id || user?.id;
      const activeEmail = u?.email || user?.email;
      if (activeId) headers['x-demo-user-id'] = activeId;
      if (activeEmail) headers['x-demo-user-email'] = activeEmail;

      const res = await fetch('/api/storefront/customer/profile', {
        headers,
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setUser((prev) => ({
            id: data.profile.authUserId || data.profile.id,
            name: data.profile.name || prev?.name || 'Driver',
            email: data.profile.email || prev?.email || '',
            phone: data.profile.phone || prev?.phone || '',
            avatarUrl: data.profile.avatarUrl ?? prev?.avatarUrl ?? '',
            joinedDate: data.profile.joinedDate || prev?.joinedDate || 'Oct 2024',
            tier: (data.profile.tier && data.profile.tier !== 'Apex Gold Member') ? data.profile.tier : (prev?.tier && prev.tier !== 'Apex Gold Member' ? prev.tier : undefined),
            rewardPoints: data.profile.rewardPoints ?? prev?.rewardPoints ?? 250,
          }));

          if (data.profile.communicationPrefs) {
            setCommunicationPrefs(data.profile.communicationPrefs);
          }
          if (data.profile.gstBilling) {
            setGstBilling(data.profile.gstBilling);
          }
          if (Array.isArray(data.profile.savedPayments)) {
            setSavedPayments(data.profile.savedPayments);
          }
          if (Array.isArray(data.profile.garageVehicles) && data.profile.garageVehicles.length > 0) {
            setGarageVehicles(data.profile.garageVehicles);
          }
          if (data.profile.activeVehicle) {
            setCar(data.profile.activeVehicle);
          }

          if (data.profile.b2bStatus) {
            setB2bProfile({
              status: data.profile.b2bStatus,
              businessName: data.profile.businessName || undefined,
              tradeName: data.profile.tradeName || undefined,
              gstin: data.profile.gstin || undefined,
              pan: data.profile.pan || undefined,
              businessType: data.profile.businessType || undefined,
              businessAddress: data.profile.businessAddress || undefined,
              city: data.profile.city || undefined,
              state: data.profile.state || undefined,
              pincode: data.profile.pincode || undefined,
              expectedMonthlyVolume: data.profile.expectedMonthlyVolume || undefined,
              wholesaleTier: data.profile.wholesaleTier || 'tier1',
              rejectionReason: data.profile.b2bRejectionReason || undefined,
              inquiryMessage: data.profile.b2bRejectionReason || undefined,
              appliedAt: data.profile.b2bAppliedAt || undefined,
              referenceNumber: data.profile.referenceNumber || undefined,
            });
          }
        }

        if (Array.isArray(data.addresses)) {
          setAddresses(data.addresses);
        }

        if (Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      }
    } catch (err) {
      console.warn('Could not load backend customer profile:', err);
    }
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
                const parsed = JSON.parse(cached);
                setUser(parsed);
                void fetchCustomerBackendProfile(undefined, parsed);
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
            void fetchCustomerBackendProfile(data.session.access_token, data.session.user);
          } else {
            try {
              const cached = localStorage.getItem('cx_demo_user');
              if (cached) {
                const parsed = JSON.parse(cached);
                setUser(parsed);
                void fetchCustomerBackendProfile(undefined, parsed);
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
          void fetchCustomerBackendProfile(session.access_token, session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setOrders([]);
          setAddresses([]);
          setB2bProfile(null);
          try {
            localStorage.removeItem('cx_demo_user');
            localStorage.removeItem('cx_user');
            localStorage.removeItem('cx_order_history');
            localStorage.removeItem('cx_addresses');
            localStorage.removeItem('cx_user_profile');
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

      const savedPm = localStorage.getItem('cx_saved_payments');
      if (savedPm) {
        const parsed = JSON.parse(savedPm);
        if (Array.isArray(parsed) && parsed.length > 0) setSavedPayments(parsed);
      }

      const savedPrefs = localStorage.getItem('cx_communication_prefs');
      if (savedPrefs) setCommunicationPrefs(JSON.parse(savedPrefs));

      const savedGst = localStorage.getItem('cx_gst_billing');
      if (savedGst) setGstBilling(JSON.parse(savedGst));

      const savedGarage = localStorage.getItem('cx_garage_vehicles');
      if (savedGarage) {
        const parsed = JSON.parse(savedGarage);
        if (Array.isArray(parsed) && parsed.length > 0) setGarageVehicles(parsed);
      }
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

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('cx_garage_vehicles', JSON.stringify(garageVehicles));
    } catch (e) {}
  }, [garageVehicles, isLoaded]);

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
      rewardPoints: 250,
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
        setOrders([]);
        setAddresses([]);
        setB2bProfile(null);
        void fetchCustomerBackendProfile(data.session?.access_token, data.user);
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
        setOrders([]);
        setAddresses([]);
        setB2bProfile(null);
        try {
          localStorage.removeItem('cx_order_history');
          localStorage.removeItem('cx_addresses');
          localStorage.removeItem('cx_user_profile');
        } catch {}
        void fetchCustomerBackendProfile(signInData.session?.access_token, signInData.user);
        showToast(`Welcome to CARXEN, ${constructed.name}!`);
      }

      return { error: null, requiresEmailConfirmation: false };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Sign up failed' };
    }
  };

  const signInWithGoogle = async (redirectTarget: string = '/account'): Promise<{ error: string | null }> => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const target = redirectTarget.startsWith('/') && !redirectTarget.startsWith('//') ? redirectTarget : '/account';
      const callbackUrl = `${origin}/auth/callback?redirect=${encodeURIComponent(target)}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in could not be initiated.';
      return { error: msg };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign out error:', e);
    }
    setUser(null);
    setOrders([]);
    setAddresses([]);
    setB2bProfile(null);
    try {
      localStorage.removeItem('cx_demo_user');
      localStorage.removeItem('cx_user');
      localStorage.removeItem('cx_order_history');
      localStorage.removeItem('cx_addresses');
      localStorage.removeItem('cx_user_profile');
      localStorage.removeItem('cx_custom_coupons');
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

    try {
      const headers = await getAuthHeaders();
      await fetch('/api/storefront/customer/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileUpdates),
      });
    } catch (err) {
      console.warn('Backend profile update error:', err);
    }

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
  const addAddress = async (addr: Omit<CustomerAddress, 'id'>) => {
    const tempId = `addr_${Date.now()}`;
    const newAddressObj: CustomerAddress = {
      id: tempId,
      ...addr,
      isPrimary: addr.isPrimary || addresses.length === 0,
    };

    setAddresses((prev) => {
      let updated = prev;
      if (addr.isPrimary || prev.length === 0) {
        updated = prev.map((a) => ({ ...a, isPrimary: false }));
      }
      return [newAddressObj, ...updated];
    });
    showToast('Address added to your account');

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/storefront/customer/addresses', {
        method: 'POST',
        headers,
        body: JSON.stringify(addr),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.address?.id) {
          setAddresses((prev) =>
            prev.map((a) => (a.id === tempId ? data.address : a))
          );
        }
      }
    } catch (err) {
      console.warn('Backend address save error:', err);
    }
  };

  const updateAddress = async (id: string, updates: Partial<CustomerAddress>) => {
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

    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/storefront/customer/addresses/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('Backend address update error:', err);
    }
  };

  const deleteAddress = async (id: string) => {
    setAddresses((prev) => {
      const target = prev.find((a) => a.id === id);
      const remaining = prev.filter((a) => a.id !== id);
      if (target?.isPrimary && remaining.length > 0) {
        remaining[0].isPrimary = true;
      }
      return remaining;
    });
    showToast('Address removed');

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/storefront/customer/addresses/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.addresses)) {
          setAddresses(data.addresses);
        }
      }
    } catch (err) {
      console.warn('Backend address delete error:', err);
    }
  };

  const setPrimaryAddress = async (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isPrimary: a.id === id,
      }))
    );
    showToast('Primary delivery address updated');

    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/storefront/customer/addresses/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isPrimary: true }),
      });
    } catch (err) {
      console.warn('Backend primary address update error:', err);
    }
  };

  // Orders
  const saveOrderToHistory = (order: CustomerOrderHistoryRecord) => {
    setOrders((prev) => {
      const updated = [order, ...prev.filter((o) => o.orderNumber !== order.orderNumber)];
      try {
        localStorage.setItem('cx_order_history', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to sync order history to localStorage:', err);
      }
      return updated;
    });
  };

  // Saved Payment Methods CRUD
  const addSavedPayment = async (pm: Omit<SavedPaymentMethod, 'id'>) => {
    const newId = `pm_${Date.now()}`;
    let nextList: SavedPaymentMethod[] = [];
    setSavedPayments((prev) => {
      let updated = prev;
      if (pm.isDefault || prev.length === 0) {
        updated = prev.map((p) => ({ ...p, isDefault: false }));
      }
      nextList = [{ id: newId, ...pm, isDefault: pm.isDefault || prev.length === 0 }, ...updated];
      return nextList;
    });
    showToast('Payment method saved');

    try {
      const headers = await getAuthHeaders();
      await fetch('/api/storefront/customer/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ savedPayments: nextList }),
      });
    } catch (err) {
      console.warn('Backend saved payments sync error:', err);
    }
  };

  const deleteSavedPayment = async (id: string) => {
    let nextList: SavedPaymentMethod[] = [];
    setSavedPayments((prev) => {
      const target = prev.find((p) => p.id === id);
      const remaining = prev.filter((p) => p.id !== id);
      if (target?.isDefault && remaining.length > 0) {
        remaining[0].isDefault = true;
      }
      nextList = remaining;
      return remaining;
    });
    showToast('Payment method removed');

    try {
      const headers = await getAuthHeaders();
      await fetch('/api/storefront/customer/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ savedPayments: nextList }),
      });
    } catch (err) {
      console.warn('Backend saved payments delete sync error:', err);
    }
  };

  const setDefaultPayment = async (id: string) => {
    let nextList: SavedPaymentMethod[] = [];
    setSavedPayments((prev) => {
      nextList = prev.map((p) => ({
        ...p,
        isDefault: p.id === id,
      }));
      return nextList;
    });
    showToast('Default payment method set');

    try {
      const headers = await getAuthHeaders();
      await fetch('/api/storefront/customer/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ savedPayments: nextList }),
      });
    } catch (err) {
      console.warn('Backend saved payments default sync error:', err);
    }
  };

  const updateCommunicationPrefs = async (prefs: Partial<CommunicationPreferences>) => {
    const updated = { ...communicationPrefs, ...prefs };
    setCommunicationPrefs(updated);
    showToast('Preferences updated');

    try {
      const headers = await getAuthHeaders();
      await fetch('/api/storefront/customer/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ communicationPrefs: updated }),
      });
    } catch (err) {
      console.warn('Backend communication prefs error:', err);
    }
  };

  const updateGstBilling = async (info: Partial<GstBillingInfo>) => {
    const updated = { ...gstBilling, ...info };
    setGstBilling(updated);
    showToast('GST billing preferences saved');

    try {
      const headers = await getAuthHeaders();
      await fetch('/api/storefront/customer/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ gstBilling: updated }),
      });
    } catch (err) {
      console.warn('Backend GST billing update error:', err);
    }
  };

  const setVehicle = async (v: Vehicle) => {
    setCar(v);
    showToast(`Garage set — ${v.y} ${v.b} ${v.m}`);

    try {
      const headers = await getAuthHeaders();
      await fetch('/api/storefront/customer/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ activeVehicle: v }),
      });
    } catch (err) {
      // quiet
    }
  };

  const addGarageVehicle = async (v: Omit<GarageVehicle, 'id'>) => {
    const newVeh: GarageVehicle = {
      ...v,
      id: `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    const updated = v.isDefault
      ? [...garageVehicles.map((item) => ({ ...item, isDefault: false })), newVeh]
      : [...garageVehicles, newVeh];

    setGarageVehicles(updated);
    if (newVeh.isDefault || !car) {
      setCar({ b: newVeh.b, m: newVeh.m, y: newVeh.y, f: newVeh.f });
    }
    showToast(`Added ${newVeh.y} ${newVeh.b} ${newVeh.m} to Garage`);

    try {
      const headers = await getAuthHeaders();
      await fetch('/api/storefront/customer/vehicles', {
        method: 'POST',
        headers,
        body: JSON.stringify(newVeh),
      });
    } catch (err) {
      console.warn('Backend vehicle save error:', err);
    }
    return newVeh;
  };

  const updateGarageVehicle = async (v: GarageVehicle) => {
    const updated = garageVehicles.map((item) => {
      if (item.id === v.id) return v;
      if (v.isDefault) return { ...item, isDefault: false };
      return item;
    });
    setGarageVehicles(updated);

    if (v.isDefault || (car && car.m === v.m)) {
      setCar({ b: v.b, m: v.m, y: v.y, f: v.f });
    }
    showToast(`Updated ${v.y} ${v.b} ${v.m}`);

    try {
      const headers = await getAuthHeaders();
      await fetch('/api/storefront/customer/vehicles', {
        method: 'PUT',
        headers,
        body: JSON.stringify(v),
      });
    } catch (err) {
      console.warn('Backend vehicle update error:', err);
    }
  };

  const deleteGarageVehicle = async (id: string) => {
    const target = garageVehicles.find((x) => x.id === id);
    const updated = garageVehicles.filter((x) => x.id !== id);
    setGarageVehicles(updated);

    if (target && car && car.m === target.m && car.y === target.y) {
      if (updated.length > 0) {
        const nextActive = updated[0];
        setCar({ b: nextActive.b, m: nextActive.m, y: nextActive.y, f: nextActive.f });
      }
    }
    showToast('Vehicle removed from garage');

    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/storefront/customer/vehicles?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });
    } catch (err) {
      console.warn('Backend vehicle delete error:', err);
    }
  };

  const addToCart = (productId: number, qty = 1) => {
    const p = products.find((x) => x.id === productId);
    const moq = (isWholesaleApproved && p?.b2bMoq) ? p.b2bMoq : 1;

    setCart((prev) => {
      const current = prev[productId] || 0;
      const initialQty = current === 0 ? Math.max(qty, moq) : current + qty;
      return { ...prev, [productId]: initialQty };
    });
    if (p) {
      showToast(`Added to cart — ${p.n}${isWholesaleApproved ? ` (Min. ${moq} units)` : ''}`);
    }
  };

  const updateCartQty = (productId: number, delta: number) => {
    const p = products.find((x) => x.id === productId);
    const moq = (isWholesaleApproved && p?.b2bMoq) ? p.b2bMoq : 1;

    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0 || (isWholesaleApproved && next < moq && delta < 0)) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: Math.max(next, moq) };
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

  const setWorkspaceMode = useCallback((mode: 'retail' | 'wholesale') => {
    setWorkspaceModeState(mode);
    try {
      localStorage.setItem('cx_workspace_mode', mode);
    } catch {}
  }, []);

  const addToWholesaleBasket = useCallback((productId: number, qty = 1) => {
    const p = products.find((x) => x.id === productId);
    const moq = p?.b2bMoq || 5;

    setWholesaleBasket((prev) => {
      const current = prev[productId] || 0;
      const initialQty = current === 0 ? Math.max(qty, moq) : current + qty;
      const next = { ...prev, [productId]: initialQty };
      try {
        localStorage.setItem('cx_wholesale_basket', JSON.stringify(next));
      } catch {}
      return next;
    });
    if (p) {
      showToast(`Added to Wholesale Order Basket — ${p.n} (${qty} units)`);
    }
  }, [products]);

  const updateWholesaleBasketQty = useCallback((productId: number, qty: number) => {
    setWholesaleBasket((prev) => {
      const copy = { ...prev };
      if (qty <= 0) {
        delete copy[productId];
      } else {
        copy[productId] = qty;
      }
      try {
        localStorage.setItem('cx_wholesale_basket', JSON.stringify(copy));
      } catch {}
      return copy;
    });
  }, []);

  const removeFromWholesaleBasket = useCallback((productId: number) => {
    setWholesaleBasket((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      try {
        localStorage.setItem('cx_wholesale_basket', JSON.stringify(copy));
      } catch {}
      return copy;
    });
    const p = products.find((x) => x.id === productId);
    if (p) showToast(`Removed from Wholesale Basket — ${p.n}`);
  }, [products]);

  const clearWholesaleBasket = useCallback(() => {
    setWholesaleBasket({});
    try {
      localStorage.removeItem('cx_wholesale_basket');
    } catch {}
  }, []);

  const wholesaleBasketCount = useMemo(() => {
    return Object.values(wholesaleBasket).reduce((a, b) => a + b, 0);
  }, [wholesaleBasket]);

  const wholesaleBasketSkuCount = useMemo(() => {
    return Object.values(wholesaleBasket).filter((q) => q > 0).length;
  }, [wholesaleBasket]);

  const wholesaleBasketSubtotal = useMemo(() => {
    return Object.entries(wholesaleBasket).reduce((sum, [idStr, q]) => {
      const p = products.find((x) => x.id === Number(idStr));
      if (!p) return sum;
      return sum + calculateItemPriceWithOfferLimit(p, q, true).totalPrice;
    }, 0);
  }, [wholesaleBasket, products]);

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
      if (!p) return total;
      const priceResult = calculateItemPriceWithOfferLimit(p, qty, isWholesaleApproved);
      return total + priceResult.totalPrice;
    }, 0);
  }, [cart, products, isWholesaleApproved]);

  // Total products bought across all non-cancelled orders in customer history
  const totalProductsBought = useMemo(() => {
    return orders.reduce((sum, order) => {
      if (order.status?.toLowerCase() === 'cancelled') return sum;
      const orderProductsCount = (order.items || []).reduce(
        (itemSum, item) => itemSum + (item.quantity || 1),
        0
      );
      return sum + orderProductsCount;
    }, 0);
  }, [orders]);

  // Completed non-cancelled order count for the active logged-in user
  const userOrderCount = useMemo(() => {
    if (!user || !user.email) return 0;
    return orders.filter((order) => {
      const status = (order.status || '').toLowerCase();
      return status !== 'cancelled' && status !== 'refunded';
    }).length;
  }, [user, orders]);

  // Verified Buyer status is granted strictly to logged-in users with 3 or more completed orders
  const isVerifiedBuyer = useMemo(() => {
    return Boolean(user && user.email && userOrderCount >= 3);
  }, [user, userOrderCount]);

  return (
    <AppContext.Provider
      value={{
        products,
        storeSettings,
        storefrontConfig: storeSettings?.storefront || null,
        catalogStatus,
        catalogError,
        retryCatalog,
        user,
        authLoading,
        car,
        cart,
        cartCount,
        cartSubtotal,
        isVerifiedBuyer,
        totalProductsBought,
        b2bProfile,
        isWholesaleApproved,
        isWholesalePending,
        isWholesaleInquiry,
        applyForWholesale: async (applicationData: any) => {
          try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/storefront/b2b/apply', {
              method: 'POST',
              headers,
              body: JSON.stringify(applicationData),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              const friendlyError = formatUserFriendlyB2BError(
                data.error || 'Failed to submit application. Please review your details and try again.'
              );
              return { success: false, error: friendlyError };
            }
            setB2bProfile({
              status: 'PENDING',
              businessName: applicationData.businessName,
              tradeName: applicationData.tradeName,
              gstin: applicationData.gstin,
              pan: applicationData.pan,
              businessType: applicationData.businessType,
              businessAddress: applicationData.businessAddress,
              city: applicationData.city,
              state: applicationData.state,
              pincode: applicationData.pincode,
              expectedMonthlyVolume: applicationData.expectedMonthlyVolume,
              wholesaleTier: 'tier1',
              appliedAt: new Date().toISOString(),
              referenceNumber:
                data.referenceNumber ||
                (applicationData.gstin
                  ? `CX-B2B-${applicationData.gstin.replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase()}`
                  : 'CX-B2B-8841'),
            });
            showToast('Wholesale application submitted for review');
            return { success: true };
          } catch (err) {
            return {
              success: false,
              error: formatUserFriendlyB2BError(err),
            };
          }
        },
        updateB2bProfile: async (updates: Partial<B2BProfile> & { name?: string; phone?: string }) => {
          try {
            setB2bProfile((prev) => {
              const next: B2BProfile = {
                status: prev?.status || 'APPROVED',
                wholesaleTier: prev?.wholesaleTier || 'tier1',
                ...prev,
                ...updates,
              };
              try {
                localStorage.setItem('cx_b2b_profile', JSON.stringify(next));
              } catch {}
              return next;
            });

            if (updates.name || updates.phone) {
              setUser((prev) => {
                if (!prev) return prev;
                const updatedUser = {
                  ...prev,
                  name: updates.name !== undefined && updates.name.trim() ? updates.name.trim() : prev.name,
                  phone: updates.phone !== undefined ? updates.phone.trim() : prev.phone,
                };
                try {
                  localStorage.setItem('cx_user_profile', JSON.stringify(updatedUser));
                  localStorage.setItem('cx_demo_user', JSON.stringify(updatedUser));
                } catch {}
                return updatedUser;
              });
            }

            const headers = await getAuthHeaders();
            const res = await fetch('/api/storefront/customer/profile', {
              method: 'PUT',
              headers,
              body: JSON.stringify(updates),
            });

            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              showToast(data.error || 'Saved locally (server sync issue)');
              return { success: true };
            }

            showToast('Business profile updated successfully');
            return { success: true };
          } catch (err) {
            console.warn('Backend business profile update error:', err);
            showToast('Business profile saved locally');
            return { success: true };
          }
        },
        refreshCustomerProfile: async () => {
          await fetchCustomerBackendProfile();
          const headers = await getAuthHeaders();
          const response = await loadCatalogProducts(undefined, headers);
          setProducts(response.products);
        },
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
        garageVehicles,
        addGarageVehicle,
        updateGarageVehicle,
        deleteGarageVehicle,
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
        coupons,
        refreshCoupons,
        workspaceMode,
        setWorkspaceMode,
        wholesaleBasket,
        wholesaleBasketCount,
        wholesaleBasketSkuCount,
        wholesaleBasketSubtotal,
        addToWholesaleBasket,
        updateWholesaleBasketQty,
        removeFromWholesaleBasket,
        clearWholesaleBasket,
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
