import { Router, type IRouter } from "express";
import healthRouter from "./health";
import booksRouter from "./books";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(booksRouter);
router.use(dashboardRouter);

export default router;
