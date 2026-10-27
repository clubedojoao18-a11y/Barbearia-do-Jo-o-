CREATE TABLE products (id TEXT PRIMARY KEY,name TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>=0),cost INTEGER NOT NULL DEFAULT 0 CHECK(cost>=0),stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0),minimum INTEGER NOT NULL DEFAULT 0 CHECK(minimum>=0),active INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
CREATE TABLE stock_movements (id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),quantity INTEGER NOT NULL CHECK(quantity<>0),reason TEXT NOT NULL,actor_id TEXT NOT NULL,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TRIGGER stock_movement_apply AFTER INSERT ON stock_movements BEGIN UPDATE products SET stock=stock+NEW.quantity WHERE id=NEW.product_id; END;
--> statement-breakpoint
CREATE TABLE ledger (id TEXT PRIMARY KEY,project TEXT NOT NULL CHECK(project IN ('barbearia','eusou','pessoal')),direction TEXT NOT NULL CHECK(direction IN ('income','expense')),amount INTEGER NOT NULL CHECK(amount>0),description TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('expected','received')),date TEXT NOT NULL,user_id TEXT,reference TEXT,actor_id TEXT NOT NULL,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX ledger_reference ON ledger(reference) WHERE reference IS NOT NULL;
--> statement-breakpoint
CREATE TABLE sales (id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),quantity INTEGER NOT NULL CHECK(quantity>0),unit_price INTEGER NOT NULL,cost INTEGER NOT NULL,actor_id TEXT NOT NULL,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE commission_rules (barber_id TEXT PRIMARY KEY REFERENCES users(id),percent INTEGER NOT NULL DEFAULT 0 CHECK(percent BETWEEN 0 AND 100),fixed_service INTEGER NOT NULL DEFAULT 0 CHECK(fixed_service>=0),fixed_day INTEGER NOT NULL DEFAULT 0 CHECK(fixed_day>=0),services TEXT NOT NULL DEFAULT '{}');
--> statement-breakpoint
CREATE TABLE commission_accruals (appointment_id TEXT PRIMARY KEY REFERENCES appointments(id),barber_id TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>=0),date TEXT NOT NULL,rule TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE dependents (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
ALTER TABLE appointments ADD COLUMN dependent_id TEXT REFERENCES dependents(id);
--> statement-breakpoint
ALTER TABLE appointments ADD COLUMN confirmed_at INTEGER;
--> statement-breakpoint
CREATE TABLE waitlist (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),date TEXT NOT NULL,service TEXT NOT NULL,barber_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'waiting',created_at INTEGER NOT NULL,UNIQUE(user_id,date,service,barber_id));
--> statement-breakpoint
CREATE TABLE eu_courses (id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL,educator_id TEXT NOT NULL REFERENCES users(id),published INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE eu_lessons (id TEXT PRIMARY KEY,course_id TEXT NOT NULL REFERENCES eu_courses(id),module TEXT NOT NULL,title TEXT NOT NULL,content TEXT NOT NULL,url TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 0,authorized INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE eu_members (user_id TEXT PRIMARY KEY REFERENCES users(id),role TEXT NOT NULL CHECK(role IN ('member','educator','founder')),paid_until INTEGER NOT NULL,ledger_id TEXT NOT NULL UNIQUE REFERENCES ledger(id));
--> statement-breakpoint
CREATE TABLE eu_progress (user_id TEXT NOT NULL REFERENCES users(id),lesson_id TEXT NOT NULL REFERENCES eu_lessons(id),completed_at INTEGER NOT NULL,PRIMARY KEY(user_id,lesson_id));
--> statement-breakpoint
CREATE TABLE eu_events (id TEXT PRIMARY KEY,title TEXT NOT NULL,date TEXT NOT NULL,description TEXT NOT NULL,url TEXT NOT NULL DEFAULT '');
--> statement-breakpoint
CREATE TABLE editorial (id TEXT PRIMARY KEY,project TEXT NOT NULL CHECK(project IN ('barbearia','eusou')),title TEXT NOT NULL,caption TEXT NOT NULL,asset_url TEXT NOT NULL DEFAULT '',scheduled_at TEXT NOT NULL DEFAULT '',status TEXT NOT NULL CHECK(status IN ('draft','approved','scheduled','published')),authorized INTEGER NOT NULL DEFAULT 0,remote_id TEXT,hash TEXT NOT NULL UNIQUE,actor_id TEXT NOT NULL,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX ledger_date_project ON ledger(date,project);
--> statement-breakpoint
CREATE INDEX waitlist_date ON waitlist(date,status);
--> statement-breakpoint
CREATE TABLE appointment_transitions (appointment_id TEXT PRIMARY KEY REFERENCES appointments(id),action TEXT NOT NULL,created_at INTEGER NOT NULL);
