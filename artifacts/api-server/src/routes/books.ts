import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db, booksTable } from "@workspace/db";
import {
  GetBookParams,
  GetBookResponse,
  ImportBookBody,
  ImportBookResponse,
  ListBooksResponse,
} from "@workspace/api-zod";
import { z } from "zod";

const router: IRouter = Router();

const studyItem = z.object({ term: z.string().min(1), meaning: z.string().min(1), example: z.string().min(1), pronunciation: z.string().min(1), difficulty: z.string().min(1) });
const studyPlan = z.object({ vocabulary: z.array(studyItem), idioms: z.array(studyItem), phrasalVerbs: z.array(studyItem) });

function textForPrompt(content: string) {
  if (content.startsWith("data:")) {
    const encoded = content.split(",", 2)[1] ?? "";
    try { return Buffer.from(encoded, "base64").toString("utf8").replace(/[^\x09\x0A\x0D\x20-\x7EÀ-ÿ]/g, " "); } catch { return ""; }
  }
  return content;
}

async function createStudyPlan(endpoint: string, model: string, content: string) {
  const base = endpoint.replace(/\/+$/, "");
  const response = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model, stream: false, format: "json",
      prompt: `Create a language study plan from this text. Return ONLY valid JSON with exactly these arrays: vocabulary, idioms, phrasalVerbs. Each array has up to 8 objects with term, meaning (Portuguese), example, pronunciation, difficulty (CEFR). Do not invent a generic plan; use terms present or strongly implied by the text.\nTEXT:\n${textForPrompt(content).slice(0, 24000)}`,
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`Ollama respondeu com erro ${response.status}.`);
  const payload = await response.json() as { response?: string };
  let parsed: unknown;
  try { parsed = JSON.parse(payload.response ?? ""); } catch { throw new Error("Ollama devolveu um plano que não é JSON válido."); }
  return studyPlan.parse(parsed);
}

router.get("/books", async (_req, res, next) => {
  try {
    const rows = await db.select({
      id: booksTable.id, title: booksTable.title, author: booksTable.author,
      sourceType: booksTable.sourceType, status: booksTable.status, level: booksTable.level,
      progress: booksTable.progress, coverColor: booksTable.coverColor, updatedAt: booksTable.updatedAt,
    }).from(booksTable).orderBy(desc(booksTable.updatedAt));
    res.json(ListBooksResponse.parse(rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() }))));
  } catch (error) { next(error); }
});

router.post("/books", async (req, res, next) => {
  try {
    const body = ImportBookBody.parse(req.body);
    const plan = await createStudyPlan(body.ollamaEndpoint, body.ollamaModel, body.content);
    const id = randomUUID();
    const row = {
      id, title: body.title, author: body.author, sourceType: body.sourceType,
      status: "READY", level: "B2", progress: 0, coverColor: "#D7F0E5",
      content: body.content, plan,
    };
    await db.insert(booksTable).values(row);
    res.status(201).json(ImportBookResponse.parse({ ...row, updatedAt: new Date().toISOString() }));
  } catch (error) { next(error); }
});

router.get("/books/:bookId", async (req, res, next) => {
  try {
    const { bookId } = GetBookParams.parse(req.params);
    const [row] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);
    if (!row) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
    res.json(GetBookResponse.parse({
      ...row, updatedAt: row.updatedAt.toISOString(), plan: row.plan,
    }));
  } catch (error) { next(error); }
});

export default router;