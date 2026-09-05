export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export type PaymentStatus = 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';
export type CouponDiscountType = 'flat' | 'percentage';
export type LoyaltyTransactionType = 'earn' | 'redeem' | 'adjustment';
export type ReferralStatus = 'pending' | 'completed';

export interface Category {
  id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  rating: number;
  is_available: boolean;
  is_featured: boolean;
  created_at: string;
  loyalty_points: number;
}

export interface User {
  id: string;
  name: string | null;
  phone: string | null;
  created_at: string;
  phone_verified: boolean;
  loyalty_points_balance: number;
  referral_code: string | null;
  referred_by: string | null;
}

export interface Order {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  subtotal: number;
  delivery_charge: number;
  discount: number;
  total: number;
  delivery_address: string;
  delivery_date: string | null;
  delivery_time: string | null;
  razorpay_order_id: string | null;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  payment_method: 'online' | 'cod';
  points_earned: number;
  points_redeemed: number;
  points_discount: number;
  coupon_id: string | null;
  coupon_discount: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: Record<string, unknown> | null;
  created_at: string;
  points_earned: number;
}

export interface Payment {
  id: string;
  order_id: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string;
  razorpay_signature: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_value: number;
  usage_limit: number | null;
  usage_limit_per_user: number;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  order_id: string | null;
  type: LoyaltyTransactionType;
  points: number;
  balance_after: number;
  note: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: ReferralStatus;
  reward_points: number;
  completed_at: string | null;
  created_at: string;
}

export interface ServiceablePincode {
  id: string;
  pincode: string;
  area_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OrderWithItems extends Order {
  order_items: (OrderItem & {
    products: Pick<Product, 'name' | 'image_url'> | null;
  })[];
}