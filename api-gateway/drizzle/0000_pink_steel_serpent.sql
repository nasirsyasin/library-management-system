CREATE TYPE "public"."account_role" AS ENUM('member', 'librarian');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "identity_account" (
	"member_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" varchar(256) NOT NULL,
	"phone" varchar(40),
	"address" varchar(500),
	"role" "account_role" DEFAULT 'member' NOT NULL,
	"status" "account_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "identity_account_email_uq" ON "identity_account" USING btree ("email");