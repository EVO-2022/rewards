import { Router } from "express";
import { validate } from "../middleware/validation";
import { authenticate, adminAuth, requireBrandAccess } from "../middleware/auth";
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

// Routes that only need authentication (no brand access check)
router.get("/mine", authenticate, brandController.getMyBrands);
router.post("/", authenticate, validate(createBrandSchema), brandController.createBrand);

// Public route (no auth required)
router.get("/", brandController.getBrands);

// Brand-scoped admin routes (require adminAuth + brand access)
router.get("/:brandId/summary", adminAuth, requireBrandAccess(), brandController.getBrandSummary);
router.get("/:brandId/members", adminAuth, requireBrandAccess(), brandController.getBrandMembers);
router.get("/:brandId/events", adminAuth, requireBrandAccess(), brandController.getBrandEvents);
router.get("/:brandId/ledger", adminAuth, requireBrandAccess(), brandController.getBrandLedger);
router.get("/:brandId", adminAuth, requireBrandAccess(), brandController.getBrand);
router.patch("/:brandId", adminAuth, requireBrandAccess(), validate(updateBrandSchema), brandController.updateBrand);
router.delete("/:brandId", adminAuth, requireBrandAccess(), brandController.deleteBrand);

export default router;
