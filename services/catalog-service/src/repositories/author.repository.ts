import { asc } from "drizzle-orm";
import { db } from "../db";
import { authors } from "../db/schema";

export function findAllAuthors() {
  return db.select().from(authors).orderBy(asc(authors.name));
}

export function insertAuthor(name: string) {
  return db.insert(authors).values({ name }).returning().then(([author]) => author);
}
