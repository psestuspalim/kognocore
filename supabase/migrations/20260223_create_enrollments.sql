-- Stores course enrollments as JSON payload for flexible schema evolution.
CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollments_created_date ON enrollments(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_enrollments_payload_learner_id ON enrollments((payload->>'learner_id'));
CREATE INDEX IF NOT EXISTS idx_enrollments_payload_user_email ON enrollments((payload->>'user_email'));
CREATE INDEX IF NOT EXISTS idx_enrollments_payload_course_id ON enrollments((payload->>'course_id'));
