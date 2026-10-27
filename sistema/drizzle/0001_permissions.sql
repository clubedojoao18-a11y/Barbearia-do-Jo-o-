ALTER TABLE users ADD COLUMN permissions TEXT NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE team_invites (email TEXT PRIMARY KEY,role TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
--> statement-breakpoint
CREATE TABLE audit_log (id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,target_id TEXT,action TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
