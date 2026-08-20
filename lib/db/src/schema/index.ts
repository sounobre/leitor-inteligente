// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types:
//
//   import { pgTable, text, serial } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const postsTable = pgTable("posts", {
//     id: serial("id").primaryKey(),
//     title: text("title").notNull(),
//   });
//
//   export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
//   export type InsertPost = z.infer<typeof insertPostSchema>;
//   export type Post = typeof postsTable.$inferSelect;

import { jsonb, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const booksTable = pgTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  sourceType: text("source_type").notNull(),
  status: text("status").notNull(),
  level: text("level").notNull(),
  progress: integer("progress").notNull().default(0),
  coverColor: text("cover_color").notNull(),
  content: text("content").notNull().default(""),
  plan: jsonb("plan").notNull().default({ vocabulary: [], idioms: [], phrasalVerbs: [] }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookSchema = createInsertSchema(booksTable).omit({ updatedAt: true });
export type InsertBook = typeof booksTable.$inferInsert;
export type Book = typeof booksTable.$inferSelect;