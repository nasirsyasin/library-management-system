import { Request, Response } from "express";
import { AuthorService } from "../services/author.service";

export const AuthorController = {
  list: async (_req: Request, res: Response) => res.json(await AuthorService.list()),

  create: async (req: Request, res: Response) => {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Author name is required" });
    res.status(201).json(await AuthorService.create(name));
  },
};