-- Chat leads table
CREATE TABLE IF NOT EXISTS ng_chat_leads (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  destination TEXT,
  dates TEXT,
  group_size INTEGER,
  preferences TEXT,
  language TEXT DEFAULT 'da',
  source_page TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS ng_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON ng_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_leads_email ON ng_chat_leads(email);
CREATE INDEX IF NOT EXISTS idx_chat_leads_created ON ng_chat_leads(created_at DESC);

-- Enable RLS
ALTER TABLE ng_chat_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ng_chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anon (chatbot widget)
CREATE POLICY "Allow anon insert leads" ON ng_chat_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert messages" ON ng_chat_messages FOR INSERT WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Allow service role all leads" ON ng_chat_leads FOR ALL USING (true);
CREATE POLICY "Allow service role all messages" ON ng_chat_messages FOR ALL USING (true);
