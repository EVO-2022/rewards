import { Router } from "express";
import { validate } from "../middleware/validation";
import { authenticate, syncUser, requireBrandAccess } from "../middleware/auth";
import { z } from "zod";
import * as brandController from "../controllers/brandController";

const router = Router();

const createBrandSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
});

const updateBrandSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ✅ AUTH COMPLETELY DISABLED FOR LOCAL DEV
// No authenticate
// No syncUser
// No requireBrandAccess

router.post("/", validate(createBrandSchema), brandController.createBrand);
router.get("/mine", brandController.getMyBrands);
router.get("/", brandController.getBrands);
router.get("/:brandId/summary", brandController.getBrandSummary);
router.get("/:brandId/members", brandController.getBrandMembers);
router.get("/:brandId", brandController.getBrand);
router.patch("/:brandId", validate(updateBrandSchema), brandController.updateBrand);
router.delete("/:brandId", brandController.deleteBrand);

// Events route requires authentication and brand access
router.get(
  "/:brandId/events",
  authenticate,
  syncUser,
  requireBrandAccess(),
  brandController.getBrandEvents
);

export default router;
