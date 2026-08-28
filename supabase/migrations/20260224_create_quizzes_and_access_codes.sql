-- Stores quizzes as JSON payload (mirrors quiz_attempts pattern).
CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_updated_date ON quizzes(updated_date DESC);

-- Stores admin-facing access code metadata (plaintext code for display).
-- The security-sensitive validation still uses the hashed `invites` table.
CREATE TABLE IF NOT EXISTS access_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    course_id TEXT NOT NULL,
    course_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    max_uses INT,
    current_uses INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_course_id ON access_codes(course_id);
