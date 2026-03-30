-- ============================================================
--  Property Management App – Database Migration
--  Run this in Supabase SQL Editor (project: svuiphbzceatqodluvxl)
--  All tables use pm_ prefix to avoid conflicts with existing tables.
-- ============================================================

-- Enable UUID extension (already enabled on most Supabase projects)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
--  1. PROPERTIES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_properties (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('house','condo','land')),
  project_name   TEXT,
  name           TEXT NOT NULL,
  address        TEXT,
  district       TEXT,
  province       TEXT,
  purchase_date  DATE,
  purchase_price NUMERIC(15,2),
  current_value  NUMERIC(15,2),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ────────────────────────────────────────────────────────────
--  2. DOCUMENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_documents (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id     UUID REFERENCES pm_properties(id) ON DELETE CASCADE NOT NULL,
  doc_type        TEXT NOT NULL CHECK (doc_type IN (
                    'title_deed','house_registration','mortgage',
                    'water_contract','electricity_contract',
                    'accident_insurance','fire_insurance','floor_plan','other')),
  name            TEXT NOT NULL,
  description     TEXT,
  document_number TEXT,
  issue_date      DATE,
  expiry_date     DATE,
  issuer          TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ────────────────────────────────────────────────────────────
--  3. FEES  (ค่าส่วนกลาง, ค่าฉีดปลวก ฯลฯ)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_fees (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id    UUID REFERENCES pm_properties(id) ON DELETE CASCADE NOT NULL,
  fee_type       TEXT NOT NULL CHECK (fee_type IN ('management','termite','water','electricity','garbage','other')),
  name           TEXT NOT NULL,
  amount         NUMERIC(12,2),
  frequency      TEXT NOT NULL CHECK (frequency IN ('monthly','semi_annual','annual','one_time')),
  due_month      SMALLINT CHECK (due_month BETWEEN 1 AND 12),
  last_paid_date DATE,
  next_due_date  DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ────────────────────────────────────────────────────────────
--  4. TAXES  (ภาษีที่ดิน, ภาษีคอนโด)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_taxes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id     UUID REFERENCES pm_properties(id) ON DELETE CASCADE NOT NULL,
  tax_type        TEXT NOT NULL CHECK (tax_type IN ('land','condo','other')),
  year            SMALLINT NOT NULL,
  amount          NUMERIC(12,2),
  assessed_value  NUMERIC(15,2),
  paid_date       DATE,
  receipt_number  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ────────────────────────────────────────────────────────────
--  5. EVENTS  (ซ่อมแซม, ต่อเติม, เหตุการณ์สำคัญ)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES pm_properties(id) ON DELETE CASCADE NOT NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN ('renovation','repair','incident','inspection','other')),
  title       TEXT NOT NULL,
  description TEXT,
  event_date  DATE,
  cost        NUMERIC(12,2),
  contractor  TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ────────────────────────────────────────────────────────────
--  6. PHOTOS  (polymorphic – links to any entity above)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_photos (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type    TEXT NOT NULL CHECK (entity_type IN ('property','document','fee','tax','event')),
  entity_id      UUID NOT NULL,
  storage_path   TEXT NOT NULL,
  thumbnail_path TEXT,
  original_name  TEXT,
  file_size      INTEGER,
  mime_type      TEXT,
  display_order  INTEGER DEFAULT 0 NOT NULL,
  caption        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS pm_photos_entity_idx ON pm_photos (entity_type, entity_id);

-- ────────────────────────────────────────────────────────────
--  7. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE pm_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_fees       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_taxes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_photos     ENABLE ROW LEVEL SECURITY;

-- Properties: owner only
CREATE POLICY "pm_properties_owner" ON pm_properties
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Documents, Fees, Taxes, Events: accessible if the parent property belongs to the user
CREATE POLICY "pm_documents_owner" ON pm_documents FOR ALL
  USING  (EXISTS (SELECT 1 FROM pm_properties p WHERE p.id = property_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM pm_properties p WHERE p.id = property_id AND p.user_id = auth.uid()));

CREATE POLICY "pm_fees_owner" ON pm_fees FOR ALL
  USING  (EXISTS (SELECT 1 FROM pm_properties p WHERE p.id = property_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM pm_properties p WHERE p.id = property_id AND p.user_id = auth.uid()));

CREATE POLICY "pm_taxes_owner" ON pm_taxes FOR ALL
  USING  (EXISTS (SELECT 1 FROM pm_properties p WHERE p.id = property_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM pm_properties p WHERE p.id = property_id AND p.user_id = auth.uid()));

CREATE POLICY "pm_events_owner" ON pm_events FOR ALL
  USING  (EXISTS (SELECT 1 FROM pm_properties p WHERE p.id = property_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM pm_properties p WHERE p.id = property_id AND p.user_id = auth.uid()));

-- Photos: accessible if user owns the root property (via entity_id lookup per entity_type)
-- Simplified policy: allow access if authenticated (further scoped by app logic)
-- For strict policy, replace with per-entity_type EXISTS checks.
CREATE POLICY "pm_photos_authenticated" ON pm_photos
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────────────────
--  8. REALTIME  (enable realtime on property table)
-- ────────────────────────────────────────────────────────────
-- Run in Supabase Dashboard > Database > Replication > Source > Add table:
--   pm_properties, pm_documents, pm_fees, pm_taxes, pm_events, pm_photos
-- OR via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE pm_properties;
ALTER PUBLICATION supabase_realtime ADD TABLE pm_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE pm_fees;
ALTER PUBLICATION supabase_realtime ADD TABLE pm_taxes;
ALTER PUBLICATION supabase_realtime ADD TABLE pm_events;
ALTER PUBLICATION supabase_realtime ADD TABLE pm_photos;

-- ────────────────────────────────────────────────────────────
--  9. STORAGE BUCKET
--  Create via Supabase Dashboard > Storage > New Bucket
--  Name: pm-photos   Public: YES (for public URL access)
--  Or via SQL:
-- ────────────────────────────────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pm-photos', 'pm-photos', true)
--   ON CONFLICT (id) DO NOTHING;

-- Storage policy: users can only upload/delete their own files
-- INSERT INTO storage.policies (name, bucket_id, operation, definition) VALUES
--   ('pm_photos_insert', 'pm-photos', 'INSERT', 'auth.uid()::text = (storage.foldername(name))[1]'),
--   ('pm_photos_select', 'pm-photos', 'SELECT', 'true'),
--   ('pm_photos_delete', 'pm-photos', 'DELETE', 'auth.uid()::text = (storage.foldername(name))[1]');

-- ────────────────────────────────────────────────────────────
--  Done!  All pm_ tables created with RLS enabled.
-- ────────────────────────────────────────────────────────────
