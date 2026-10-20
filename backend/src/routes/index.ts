import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { sessionController } from "../controllers/session.controller";
import { teacherController } from "../controllers/teacher.controller";
import { userController } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/api/auth/login", authController.login);
router.post("/api/auth/register", authController.register);

router.get("/api/session", authMiddleware, sessionController.getAll);
router.get("/api/session/:id", authMiddleware, sessionController.getById);
router.post("/api/session", authMiddleware, sessionController.create);
router.put("/api/session/:id", authMiddleware, sessionController.update);
router.delete("/api/session/:id", authMiddleware, sessionController.delete);
router.post(
  "/api/session/:id/participate/:userId",
  authMiddleware,
  sessionController.participate,
);
router.delete(
  "/api/session/:id/participate/:userId",
  authMiddleware,
  sessionController.unparticipate,
);

router.get("/api/teacher", authMiddleware, teacherController.getAll);
router.get("/api/teacher/:id", authMiddleware, teacherController.getById);

router.get("/api/user/:id", authMiddleware, userController.getById);
router.post(
  "/api/user/promote-admin",
  authMiddleware,
  userController.promoteSelfToAdmin,
);
router.delete("/api/user/:id", authMiddleware, userController.delete);

export default router;
