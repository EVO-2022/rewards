import { Router } from "express";
import { authenticate, requirePlatformAdmin, syncUser } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { z } from "zod";
import * as adminController from "../controllers/adminController";

const router = Router();

const suspendUserSchema = z.object({
  isSuspended: z.boolean(),
});

const suspendBrandSchema = z.object({
  isSuspended: z.boolean(),
});

// All routes require platform admin
router.use(authenticate);
router.use(syncUser);
router.use(requirePlatformAdmin);

router.get("/users", adminController.getAllUsers);
router.patch("/users/:userId/suspend", validate(suspendUserSchema), adminController.suspendUser);
router.get("/brands", adminController.getAllBrands);
router.patch("/brands/:brandId/suspend", validate(suspendBrandSchema), adminController.suspendBrand);

export default router;

