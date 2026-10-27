CREATE TABLE users (id TEXT PRIMARY KEY,email TEXT NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',role TEXT NOT NULL DEFAULT 'client',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
--> statement-breakpoint
CREATE TABLE config (key TEXT PRIMARY KEY,value TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE memberships (user_id TEXT PRIMARY KEY REFERENCES users(id),plan_id TEXT NOT NULL,billing_day INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',customer_id TEXT,subscription_id TEXT,paid_until INTEGER NOT NULL DEFAULT 0,cancel_at_period_end INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
--> statement-breakpoint
CREATE TABLE appointments (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),barber_id TEXT NOT NULL,date TEXT NOT NULL,time TEXT NOT NULL,service TEXT NOT NULL,duration INTEGER NOT NULL,price INTEGER NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'scheduled',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
--> statement-breakpoint
CREATE TABLE slots (barber_id TEXT NOT NULL,date TEXT NOT NULL,time TEXT NOT NULL,appointment_id TEXT NOT NULL REFERENCES appointments(id),PRIMARY KEY(barber_id,date,time));
--> statement-breakpoint
CREATE TABLE invoices (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),amount INTEGER NOT NULL,status TEXT NOT NULL,due_at INTEGER,paid_at INTEGER,url TEXT,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE webhook_events (id TEXT PRIMARY KEY,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX appointments_date_idx ON appointments(date,barber_id);
--> statement-breakpoint
CREATE INDEX invoice_user_idx ON invoices(user_id);

--> statement-breakpoint
CREATE TABLE monthly_usage (user_id TEXT NOT NULL,month TEXT NOT NULL,appointment_id TEXT NOT NULL REFERENCES appointments(id),PRIMARY KEY(user_id,month));
