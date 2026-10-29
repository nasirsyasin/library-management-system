CREATE TABLE IF NOT EXISTS "author" (
	"authorId" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "book" (
	"bookId" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"isbn" varchar NOT NULL,
	"totalCopies" integer NOT NULL,
	"availableCopies" integer NOT NULL,
	"authorAuthorId" uuid,
	CONSTRAINT "book_total_copies_nonnegative" CHECK ("totalCopies" >= 0),
	CONSTRAINT "book_available_copies_valid" CHECK ("availableCopies" >= 0 AND "availableCopies" <= "totalCopies")
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'book_total_copies_nonnegative' AND conrelid = 'public.book'::regclass) THEN
		ALTER TABLE "book" ADD CONSTRAINT "book_total_copies_nonnegative" CHECK ("totalCopies" >= 0);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'book_available_copies_valid' AND conrelid = 'public.book'::regclass) THEN
		ALTER TABLE "book" ADD CONSTRAINT "book_available_copies_valid" CHECK ("availableCopies" >= 0 AND "availableCopies" <= "totalCopies");
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.book'::regclass AND contype = 'f' AND confrelid = 'public.author'::regclass) THEN
		ALTER TABLE "book" ADD CONSTRAINT "book_authorAuthorId_author_authorId_fk" FOREIGN KEY ("authorAuthorId") REFERENCES "public"."author"("authorId") ON DELETE restrict ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "book_isbn_uq" ON "book" USING btree ("isbn");