import { z } from 'zod';

export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
export const INDIAN_PIN_REGEX = /^[1-9]\d{5}$/;
export const INDIAN_GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits.slice(0, 10);
}

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name (min 2 characters)'),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(72, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const passwordUpdateSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

export const addressSchema = z.object({
  name: z.string().trim().min(2, 'Recipient name is required'),
  phone: z
    .string()
    .transform(normalizeIndianPhone)
    .refine((val) => INDIAN_PHONE_REGEX.test(val), 'Enter a valid 10-digit Indian mobile number'),
  addressLine1: z.string().trim().min(5, 'Enter street, building, or shop address'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  postalCode: z
    .string()
    .trim()
    .refine((val) => INDIAN_PIN_REGEX.test(val), 'Enter a valid 6-digit PIN code'),
});

export const dealerOnboardingSchema = z.object({
  businessName: z.string().trim().min(3, 'Registered business / dealership name is required'),
  representativeName: z.string().trim().min(2, 'Contact person name is required'),
  phone: z
    .string()
    .transform(normalizeIndianPhone)
    .refine((val) => INDIAN_PHONE_REGEX.test(val), 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid business email'),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (val) => !val || INDIAN_GSTIN_REGEX.test(val),
      'GSTIN must be 15 characters (e.g. 27AAAAA0000A1Z5) or leave blank'
    ),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  pincode: z
    .string()
    .trim()
    .refine((val) => !val || INDIAN_PIN_REGEX.test(val), 'Enter a valid 6-digit PIN code'),
});

export function extractZodFieldErrors(result: {
  success: boolean;
  error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
}): Record<string, string> {
  if (result.success || !result.error) return {};
  const map: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] || '');
    if (key && !map[key]) {
      map[key] = issue.message;
    }
  }
  return map;
}

export type IndianCityOption = {
  city: string;
  state: string;
};

export const INDIAN_CITIES_WITH_STATE: IndianCityOption[] = [
  { city: 'Delhi', state: 'Delhi' },
  { city: 'New Delhi', state: 'Delhi' },
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Nagpur', state: 'Maharashtra' },
  { city: 'Nashik', state: 'Maharashtra' },
  { city: 'Thane', state: 'Maharashtra' },
  { city: 'Navi Mumbai', state: 'Maharashtra' },
  { city: 'Aurangabad', state: 'Maharashtra' },
  { city: 'Kolhapur', state: 'Maharashtra' },
  { city: 'Solapur', state: 'Maharashtra' },
  { city: 'Bengaluru', state: 'Karnataka' },
  { city: 'Mysuru', state: 'Karnataka' },
  { city: 'Mangaluru', state: 'Karnataka' },
  { city: 'Hubballi', state: 'Karnataka' },
  { city: 'Belagavi', state: 'Karnataka' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Warangal', state: 'Telangana' },
  { city: 'Secunderabad', state: 'Telangana' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Coimbatore', state: 'Tamil Nadu' },
  { city: 'Madurai', state: 'Tamil Nadu' },
  { city: 'Salem', state: 'Tamil Nadu' },
  { city: 'Tiruchirappalli', state: 'Tamil Nadu' },
  { city: 'Kolkata', state: 'West Bengal' },
  { city: 'Howrah', state: 'West Bengal' },
  { city: 'Siliguri', state: 'West Bengal' },
  { city: 'Durgapur', state: 'West Bengal' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Surat', state: 'Gujarat' },
  { city: 'Vadodara', state: 'Gujarat' },
  { city: 'Rajkot', state: 'Gujarat' },
  { city: 'Gandhinagar', state: 'Gujarat' },
  { city: 'Jamnagar', state: 'Gujarat' },
  { city: 'Bhavnagar', state: 'Gujarat' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Jodhpur', state: 'Rajasthan' },
  { city: 'Udaipur', state: 'Rajasthan' },
  { city: 'Kota', state: 'Rajasthan' },
  { city: 'Ajmer', state: 'Rajasthan' },
  { city: 'Bikaner', state: 'Rajasthan' },
  { city: 'Gurugram', state: 'Haryana' },
  { city: 'Faridabad', state: 'Haryana' },
  { city: 'Panipat', state: 'Haryana' },
  { city: 'Karnal', state: 'Haryana' },
  { city: 'Ambala', state: 'Haryana' },
  { city: 'Hisar', state: 'Haryana' },
  { city: 'Rohtak', state: 'Haryana' },
  { city: 'Sonipat', state: 'Haryana' },
  { city: 'Noida', state: 'Uttar Pradesh' },
  { city: 'Greater Noida', state: 'Uttar Pradesh' },
  { city: 'Ghaziabad', state: 'Uttar Pradesh' },
  { city: 'Lucknow', state: 'Uttar Pradesh' },
  { city: 'Kanpur', state: 'Uttar Pradesh' },
  { city: 'Agra', state: 'Uttar Pradesh' },
  { city: 'Varanasi', state: 'Uttar Pradesh' },
  { city: 'Meerut', state: 'Uttar Pradesh' },
  { city: 'Prayagraj', state: 'Uttar Pradesh' },
  { city: 'Bareilly', state: 'Uttar Pradesh' },
  { city: 'Aligarh', state: 'Uttar Pradesh' },
  { city: 'Gorakhpur', state: 'Uttar Pradesh' },
  { city: 'Chandigarh', state: 'Chandigarh' },
  { city: 'Mohali', state: 'Punjab' },
  { city: 'Ludhiana', state: 'Punjab' },
  { city: 'Amritsar', state: 'Punjab' },
  { city: 'Jalandhar', state: 'Punjab' },
  { city: 'Patiala', state: 'Punjab' },
  { city: 'Bathinda', state: 'Punjab' },
  { city: 'Indore', state: 'Madhya Pradesh' },
  { city: 'Bhopal', state: 'Madhya Pradesh' },
  { city: 'Jabalpur', state: 'Madhya Pradesh' },
  { city: 'Gwalior', state: 'Madhya Pradesh' },
  { city: 'Ujjain', state: 'Madhya Pradesh' },
  { city: 'Patna', state: 'Bihar' },
  { city: 'Gaya', state: 'Bihar' },
  { city: 'Muzaffarpur', state: 'Bihar' },
  { city: 'Ranchi', state: 'Jharkhand' },
  { city: 'Jamshedpur', state: 'Jharkhand' },
  { city: 'Dhanbad', state: 'Jharkhand' },
  { city: 'Bhubaneswar', state: 'Odisha' },
  { city: 'Cuttack', state: 'Odisha' },
  { city: 'Rourkela', state: 'Odisha' },
  { city: 'Raipur', state: 'Chhattisgarh' },
  { city: 'Bilaspur', state: 'Chhattisgarh' },
  { city: 'Kochi', state: 'Kerala' },
  { city: 'Thiruvananthapuram', state: 'Kerala' },
  { city: 'Kozhikode', state: 'Kerala' },
  { city: 'Thrissur', state: 'Kerala' },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { city: 'Vijayawada', state: 'Andhra Pradesh' },
  { city: 'Guntur', state: 'Andhra Pradesh' },
  { city: 'Tirupati', state: 'Andhra Pradesh' },
  { city: 'Guwahati', state: 'Assam' },
  { city: 'Dehradun', state: 'Uttarakhand' },
  { city: 'Haridwar', state: 'Uttarakhand' },
  { city: 'Haldwani', state: 'Uttarakhand' },
  { city: 'Shimla', state: 'Himachal Pradesh' },
  { city: 'Solan', state: 'Himachal Pradesh' },
  { city: 'Jammu', state: 'Jammu & Kashmir' },
  { city: 'Srinagar', state: 'Jammu & Kashmir' },
  { city: 'Panaji', state: 'Goa' },
  { city: 'Margao', state: 'Goa' },
  { city: 'Puducherry', state: 'Puducherry' },
  { city: 'Silvassa', state: 'Dadra & Nagar Haveli' },
  { city: 'Imphal', state: 'Manipur' },
  { city: 'Shillong', state: 'Meghalaya' },
  { city: 'Agartala', state: 'Tripura' },
];
