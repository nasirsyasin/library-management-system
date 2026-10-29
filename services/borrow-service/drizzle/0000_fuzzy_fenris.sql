CREATE TABLE IF NOT EXISTS "borrow" (
	"borrowId" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memberId" varchar NOT NULL,
	"bookId" varchar NOT NULL,
	"borrowDate" timestamp NOT NULL,
	"dueDate" timestamp NOT NULL,
	"returnDate" timestamp,
	CONSTRAINT "borrow_due_after_borrow" CHECK ("dueDate" >= "borrowDate"),
	CONSTRAINT "borrow_return_after_borrow" CHECK ("returnDate" IS NULL OR "returnDate" >= "borrowDate")
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'borrow_due_after_borrow' AND conrelid = 'public.borrow'::regclass) THEN
		ALTER TABLE "borrow" ADD CONSTRAINT "borrow_due_after_borrow" CHECK ("dueDate" >= "borrowDate");
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'borrow_return_after_borrow' AND conrelid = 'public.borrow'::regclass) THEN
		ALTER TABLE "borrow" ADD CONSTRAINT "borrow_return_after_borrow" CHECK ("returnDate" IS NULL OR "returnDate" >= "borrowDate");
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "borrow_member_id_idx" ON "borrow" USING btree ("memberId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "borrow_book_id_idx" ON "borrow" USING btree ("bookId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "borrow_due_date_idx" ON "borrow" USING btree ("dueDate");