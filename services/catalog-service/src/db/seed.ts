import { db, pool } from "./index";
import { authors, books } from "./schema";

async function main(): Promise<void> {
  const [authorOneId, authorTwoId, bookOneId, bookTwoId] = [
    "a931c2dc-95ac-4e9a-875c-265581cf9b03",
    "3fa5d1af-792a-4d7a-945b-3a7b8f7080af",
    "e81e943a-d394-4ffb-a445-a2603ff35aad",
    "4578bd7e-ec92-4725-9d2b-7bc69701c357",
  ];

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(authors)
        .values([
          { authorId: authorOneId, name: "Sample Author One" },
          { authorId: authorTwoId, name: "Sample Author Two" },
        ])
        .onConflictDoNothing();

      await tx
        .insert(books)
        .values([
          {
            bookId: bookOneId,
            title: "The Sample Library",
            isbn: "9780000000001",
            totalCopies: 3,
            availableCopies: 3,
            authorAuthorId: authorOneId,
          },
          {
            bookId: bookTwoId,
            title: "Learning Database Design",
            isbn: "9780000000002",
            totalCopies: 2,
            availableCopies: 2,
            authorAuthorId: authorTwoId,
          },
        ])
        .onConflictDoNothing();
    });
    console.log("Catalog sample data seeded");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Catalog sample data seeding failed", error);
  process.exitCode = 1;
});
