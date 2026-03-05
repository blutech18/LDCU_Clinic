-- Create nurse_invitations table for pre-registering nurses by email
-- When a user signs in with Google and their email matches an invitation,
-- their profile will be automatically set to role 'nurse' with the assigned campus

CREATE TABLE IF NOT EXISTS nurse_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    assigned_campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ DEFAULT NULL,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_nurse_invitations_email ON nurse_invitations(email);

-- RLS policies
ALTER TABLE nurse_invitations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read invitations
-- (needed so auth callback can check if the signing-in email has a pending invite)
CREATE POLICY "Authenticated users can view nurse invitations"
    ON nurse_invitations FOR SELECT
    TO authenticated
    USING (true);

-- Supervisors and admins can create invitations
CREATE POLICY "Supervisors and admins can create nurse invitations"
    ON nurse_invitations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('supervisor', 'admin')
        )
    );

-- Supervisors and admins can update invitations (and auth callback to mark as used)
CREATE POLICY "Authenticated users can update nurse invitations"
    ON nurse_invitations FOR UPDATE
    TO authenticated
    USING (true);

-- Supervisors and admins can delete invitations
CREATE POLICY "Supervisors and admins can delete nurse invitations"
    ON nurse_invitations FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('supervisor', 'admin')
        )
    );
