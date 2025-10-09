import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ebmjfuvairqzxsisshep.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibWpmdXZhaXJxenhzaXNzaGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMDk5ODUsImV4cCI6MjA3NDg4NTk4NX0.Vm0cgAW0Oxt-DXKbs1TNIYbA-Zqp7b2rkI9arFEhZic';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'admin' | 'client';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_name?: string;
  created_at: string;
  updated_at: string;
}

export interface InsuranceCompany {
  id: string;
  name: string;
  created_at: string;
}

export interface Policy {
  id: string;
  policy_number: string;
  policy_type: 'kasko' | 'trafik' | 'workplace' | 'dask' | 'saglik' | 'konut' | 'isyeri';
  insurance_company_id: string;
  client_id: string;
  agent_id: string;
  start_date: string;
  end_date: string;
  premium_amount: number;
  pdf_url?: string;
  pdf_file_name?: string;
  plate_number?: string;
  location?: string;
  license_plate?: string;
  vehicle_value?: number;
  chassis_value?: number;
  accessories_value?: number;
  other_values?: number;
  no_claims_discount?: number;
  coverages?: any[];
  vehicle_brand_model?: string;
  trafik_coverage_amount?: number;
  address?: string;
  building_value?: number;
  fixtures_value?: number;
  electronics_value?: number;
  inventory_value?: number;
  workplace_other_values?: number;
  created_at: string;
  updated_at: string;
  insurance_company?: InsuranceCompany;
}

export interface Claim {
  id: string;
  claim_number?: string;
  policy_id: string;
  claim_date: string;
  claim_type: string;
  license_plate?: string;
  payment_amount: number;
  description?: string;
  client_id: string;
  created_at: string;
  updated_at: string;
  policy?: Policy;
}

export interface Settings {
  id: string;
  logo_url?: string;
  company_name: string;
  primary_color: string;
  updated_at: string;
}
