export interface Client {
  id: string;
  name: string; // Razón Social
  taxId: string; // RFC/NIF/RUT/NIT
  email: string;
  address: string; // Calle y número
  city?: string;
  zip?: string;
  phone?: string;
  country?: string;
}

export interface Product {
  id: string;
  code: string; // SKU o Código SAT/Interno
  name: string;
  price: number;
  unit?: string; // pza, serv, kg, etc.
  description?: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface TaxSetting {
  id: string;
  name: string; // e.g., "IVA 16%", "IGV 18%", "Retención ISR"
  rate: number; // e.g., 0.16
  type: 'tax' | 'retention'; // tax adds to total, retention subtracts
}

export interface Invoice {
  id: string;
  number: string; // Serial number e.g., INV-0001
  clientId: string;
  clientName: string;
  clientAddress: string;
  clientTaxId: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  
  taxRate: number; // e.g., 0.16 for 16%
  taxName: string; // e.g., "IVA"
  taxAmount: number;
  
  retentionRate: number; // e.g., 0.10 for 10%
  retentionName: string; // e.g., "Retención ISR"
  retentionAmount: number;
  
  total: number;
  status: 'draft' | 'paid' | 'pending';
}

export interface SalesReport {
  date: string;
  amount: number;
}

export interface ApiConfig {
  provider: string; // 'SAT_GT_FEL', 'SAT_MX', 'DIAN_CO', 'GENERIC'
  environment: 'sandbox' | 'production';
  apiKey: string; // Or User ID
  apiSecret: string; // Or Password/Token
  endpointUrl?: string;
  certPassword?: string; // For .p12 or .cer files
}

export interface CompanyProfile {
  name: string;
  taxId: string;
  address: string;
  logoUrl?: string;
  currency: string; // e.g., 'MXN', 'USD'
  apiConfig?: ApiConfig;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  status: 'active' | 'inactive';
  lastAccess?: string;
}