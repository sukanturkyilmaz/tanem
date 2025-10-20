export type UserRole = 'admin' | 'agent' | 'client';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_name?: string;
  tax_number?: string;
  phone?: string;
  verification_code?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  tc_number?: string;
  tax_number?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface InsuranceCompany {
  id: string;
  name: string;
  logo_url?: string;
  created_at: string;
}

export interface Policy {
  id: string;
  client_id: string;
  company_id: string;
  policy_type: string;
  policy_number: string;
  start_date: string;
  end_date: string;
  premium_amount: number;
  pdf_url?: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Claim {
  id: string;
  policy_id: string;
  claim_number: string;
  claim_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  amount: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  published_at: string;
  created_at: string;
}

export interface CustomerMessage {
  id: string;
  client_id: string;
  subject: string;
  message: string;
  status: 'open' | 'closed';
  reply?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}
