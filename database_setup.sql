-- تشغيل هذا الكود في نافذة SQL Editor داخل لوحة تحكم Supabase الخاصة بك

-- 1. جدول المستخدمين (Users)
CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  role text DEFAULT 'user',
  permissions jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- إدراج مستخدم مدير افتراضي
INSERT INTO users (username, password, role, permissions) 
VALUES ('admin', 'admin123', 'admin', '["orders", "inventory", "shipping", "expenses", "suppliers", "settings"]')
ON CONFLICT (username) DO NOTHING;

-- 2. جدول الموردين (Suppliers)
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  total_due numeric DEFAULT 0,
  total_paid numeric DEFAULT 0,
  remaining_balance numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. فواتير الموردين (استلام بضاعة)
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. مدفوعات الموردين (تسديد حساب)
CREATE TABLE IF NOT EXISTS supplier_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- تفعيل السماح بالقراءة والكتابة للجميع مؤقتاً (بما أن النظام يعمل كلوحة تحكم محلية بدون مصادقة Supabase Auth الرسمية)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All on Users" ON users FOR ALL USING (true);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All on Suppliers" ON suppliers FOR ALL USING (true);

ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All on Invoices" ON supplier_invoices FOR ALL USING (true);

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All on Payments" ON supplier_payments FOR ALL USING (true);
