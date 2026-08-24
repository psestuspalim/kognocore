-- Stores quiz attempts as JSON payload for flexible schema evolution.
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_date ON quiz_attempts(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_payload_learner_id ON quiz_attempts((payload->>'learner_id'));
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_payload_user_email ON quiz_attempts((payload->>'user_email'));
