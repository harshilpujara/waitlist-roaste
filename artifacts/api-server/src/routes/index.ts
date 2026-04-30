import { Router, type IRouter } from "express";
import healthRouter from "./health";
import roastRouter from "./roast";

const router: IRouter = Router();

router.use(healthRouter);
router.use(roastRouter);

export default router;
