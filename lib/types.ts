// lib/types.ts - Shared TypeScript types for CubiqHost

export interface User {
  id: number
  email: string
  full_name: string | null
  is_admin: boolean
  pterodactyl_user_id?: number | null
  created_at: string
  updated_at: string
}

// Alias for backward compatibility
export type Profile = User

export interface Plan {
  id: number
  name: string
  slug: string
  price: number
  cpu_percent: number
  ram_mb: number
  storage_mb: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SoftwareOption {
  id: number
  name: string
  slug: string
  egg_id: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Order {
  id: number
  user_id: number
  plan_id: number
  server_name: string
  software_id: number | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  payment_sender_name: string | null
  amount: number
  original_amount: number | null
  coupon_id: number | null
  order_type: 'new' | 'renewal' | 'upgrade'
  related_server_id: number | null
  created_at: string
  updated_at: string
  // Joined relations
  plan?: Plan
  software?: SoftwareOption
  user?: User
  profile?: User
  coupon?: Coupon | null
}

export interface Coupon {
  id: number
  code: string
  discount_percent: number
  max_uses: number
  used_count: number
  valid_from: string
  valid_until: string
  is_active: boolean
  created_at: string
}

export interface Server {
  id: number
  user_id: number
  plan_id: number
  server_name: string
  software_id: number | null
  pterodactyl_id: number | null
  pterodactyl_uuid: string | null
  pterodactyl_identifier: string | null
  status: 'active' | 'suspended' | 'deleted'
  expires_at: string
  suspended_at: string | null
  created_at: string
  updated_at: string
  // Joined relations
  plan?: Plan
  software?: SoftwareOption
  user?: User
}

export interface Invoice {
  id: number
  user_id: number
  order_id: number
  server_id: number | null
  amount: number
  type: 'new' | 'renewal' | 'upgrade' | 'world'
  status: 'pending' | 'paid'
  created_at: string
  updated_at: string
  // Joined
  server?: Server
  order?: Order
}

export interface ServerSubuser {
  id: number
  server_id: number
  owner_user_id: number
  shared_user_id: number
  pterodactyl_uuid: string | null
  created_at: string
}

export interface SiteSetting {
  id: number
  setting_key: string
  setting_value: string
  updated_at: string
}

export type SiteSettings = Record<string, string>

// -- World plan system --------------------------------------
export interface WorldPlan {
  id: number
  name: string
  slug: string
  description: string | null
  price: number
  cpu_percent: number
  ram_mb: number
  storage_mb: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface WorldPurchase {
  id: number
  user_id: number
  world_plan_id: number
  payment_sender_name: string | null
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  pterodactyl_server_id: number | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  expires_at: string | null
  // joined
  world_plan?: WorldPlan
  user?: User
}
