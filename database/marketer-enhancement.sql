-- Enhancements for marketerv2 database

ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS assigned_to TEXT,
    ADD COLUMN IF NOT EXISTS priority_level TEXT,
    ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS conversion_status TEXT;

CREATE INDEX IF NOT EXISTS idx_businesses_priority ON businesses(priority_level);
CREATE INDEX IF NOT EXISTS idx_businesses_follow_up_date ON businesses(follow_up_date);
