import { findAllAuthors, insertAuthor } from "../repositories/author.repository";

export const AuthorService = {
  list: findAllAuthors,
  create: insertAuthor,
};
