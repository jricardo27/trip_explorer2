-- Trip Templates Migration
-- Creates table for storing trip templates

CREATE TABLE IF NOT EXISTS trip_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  template_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_trip_templates_user_id ON trip_templates(user_id);

-- Index for public templates
CREATE INDEX IF NOT EXISTS idx_trip_templates_public ON trip_templates(is_public) WHERE is_public = true;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_trip_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trip_templates_updated_at
BEFORE UPDATE ON trip_templates
FOR EACH ROW
EXECUTE FUNCTION update_trip_templates_updated_at();
