import { Router } from "express";
import { authenticate, requireBrandAccess, syncUser } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { z } from "zod";
import { BrandRole } from "@prisma/client";
import * as teamController from "../controllers/teamController";

const router = Router({ mergeParams: true });

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(BrandRole),
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
router.patch("/:brandId/members/:memberId", validate(updateMemberSchema), teamController.updateTeamMember);
router.delete("/:brandId/members/:memberId", teamController.removeTeamMember);

export default router;

