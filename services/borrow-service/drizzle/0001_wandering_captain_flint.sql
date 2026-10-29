ALTER TABLE "borrow" ALTER COLUMN "borrowDate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "borrow" ALTER COLUMN "dueDate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "borrow" ADD COLUMN "status" varchar DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "borrow" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
CREATE INDEX "borrow_status_idx" ON "borrow" USING btree ("status");--> statement-breakpoint
ALTER TABLE "borrow" ADD CONSTRAINT "borrow_status_valid" CHECK ("borrow"."status" IN ('pending', 'approved', 'rejected'));