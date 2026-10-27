CREATE TABLE wa_contacts (wa_id TEXT PRIMARY KEY,user_id TEXT UNIQUE REFERENCES users(id),consent INTEGER NOT NULL DEFAULT 0,consent_at INTEGER,last_inbound INTEGER NOT NULL DEFAULT 0,mode TEXT NOT NULL DEFAULT 'bot',pending TEXT,lease_until INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE wa_link_codes (hash TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE REFERENCES users(id),expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE wa_inbox (id TEXT PRIMARY KEY,wa_id TEXT NOT NULL,kind TEXT NOT NULL,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE wa_outbox (id TEXT PRIMARY KEY,wa_id TEXT NOT NULL,kind TEXT NOT NULL,text TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending',remote_id TEXT,error_code TEXT,created_at INTEGER NOT NULL,sent_at INTEGER);
--> statement-breakpoint
CREATE TABLE wa_notifications (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,reference_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at INTEGER NOT NULL,due_at INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE appointment_channels (appointment_id TEXT PRIMARY KEY REFERENCES appointments(id),channel TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE automation_runs (id TEXT PRIMARY KEY,started_at INTEGER NOT NULL,finished_at INTEGER,status TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX wa_notifications_pending ON wa_notifications(status,due_at);
--> statement-breakpoint
CREATE INDEX wa_outbox_status ON wa_outbox(status,created_at);
