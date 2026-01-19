import { Router } from "express";
import { authenticate, requireBrandAccess, syncUser } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { z } from "zod";
import { BrandRole } from "@prisma/client";
import * as teamController from "../controllers/teamController";

const router = Router({ mergeParams: true });

const addMemberSchema = z.object({
  userId: z.string().uuid().optional(),
  clerkId: z.string().optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(BrandRole),
}).refine((data) => data.userId || data.clerkId || data.email, {
  message: "Either userId, clerkId, or email must be provided",
});

const updateMemberSchema = z.object({
  role: z.nativeEnum(BrandRole),
});

// All routes require authentication and user sync
router.use(authenticate);
router.use(syncUser);
router.use("/:brandId", requireBrandAccess("MANAGER"));

router.post("/:brandId/members", validate(addMemberSchema), teamController.addTeamMember);
router.get("/:brandId/members", teamController.getTeamMembers);
router.patch(
  "/:brandId/members/:memberId",
  validate(updateMemberSchema),
  teamController.updateTeamMember
);
router.delete("/:brandId/members/:memberId", teamController.removeTeamMember);

export default router;
