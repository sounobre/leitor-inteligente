import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, booksTable } from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res, next) => {
  try {
    const [currentBook] = await db.select({
      id: booksTable.id, title: booksTable.title, author: booksTable.author,
      sourceType: booksTable.sourceType, status: booksTable.status, level: booksTable.level,
      progress: booksTable.progress, coverColor: booksTable.coverColor, updatedAt: booksTable.updatedAt,
    }).from(booksTable).orderBy(desc(booksTable.updatedAt)).limit(1);
    const fallback = currentBook ?? {
      id: "starter", title: "The Secret Garden", author: "Frances Hodgson Burnett",
      sourceType: "EPUB", status: "READY", level: "B2", progress: 24,
      coverColor: "#D7F0E5", updatedAt: new Date(),
    };
    res.json(GetDashboardResponse.parse({
      minutesToday: 18, streak: 4, wordsLearned: 47,
      currentBook: { ...fallback, updatedAt: fallback.updatedAt.toISOString() },
    }));
  } catch (error) { next(error); }
});

export default router;