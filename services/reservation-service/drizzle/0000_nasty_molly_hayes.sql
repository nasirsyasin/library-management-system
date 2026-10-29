CREATE TABLE IF NOT EXISTS "notification" (
	"notificationId" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memberId" varchar NOT NULL,
	"message" varchar NOT NULL,
	"sentDate" timestamp NOT NULL,
	"read" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservation" (
	"reservationId" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memberId" varchar NOT NULL,
	"bookId" varchar NOT NULL,
	"requestDate" timestamp NOT NULL,
	"status" varchar DEFAULT 'waiting' NOT NULL,
	CONSTRAINT "reservation_status_valid" CHECK ("status" IN ('waiting', 'ready', 'fulfilled', 'cancelled'))
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservation_status_valid' AND conrelid = 'public.reservation'::regclass) THEN
		ALTER TABLE "reservation" ADD CONSTRAINT "reservation_status_valid" CHECK ("status" IN ('waiting', 'ready', 'fulfilled', 'cancelled'));
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_member_sent_idx" ON "notification" USING btree ("memberId","sentDate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservation_book_queue_idx" ON "reservation" USING btree ("bookId","status","requestDate","reservationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservation_member_request_idx" ON "reservation" USING btree ("memberId","requestDate");