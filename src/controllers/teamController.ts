import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { BrandRole } from "@prisma/client";
import { z } from "zod";

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(BrandRole),
});

const updateMemberSchema = z.object({
  role: z.nativeEnum(BrandRole),
});

export const addTeamMember = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const data = addMemberSchema.parse(req.body);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if membership already exists
    const existing = await prisma.brandMember.findUnique({
      where: {
        userId_brandId: {
          userId: data.userId,
          brandId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: "User is already a member" });
    }

    const membership = await prisma.brandMember.create({
      data: {
        userId: data.userId,
        brandId,
        role: data.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    res.status(201).json(membership);
  } catch (error) {
    console.error("Add team member error:", error);
    res.status(500).json({ error: "Failed to add team member" });
  }
};

export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;

    const members = await prisma.brandMember.findMany({
      where: { brandId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    res.json(members);
  } catch (error) {
    console.error("Get team members error:", error);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
};

export const updateTeamMember = async (req: Request, res: Response) => {
  try {
    const { brandId, memberId } = req.params;
    const data = updateMemberSchema.parse(req.body);

    const membership = await prisma.brandMember.update({
      where: { id: memberId },
      data: { role: data.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    res.json(membership);
  } catch (error) {
    console.error("Update team member error:", error);
    res.status(500).json({ error: "Failed to update team member" });
  }
};

export const removeTeamMember = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;

    await prisma.brandMember.delete({
      where: { id: memberId },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Remove team member error:", error);
    res.status(500).json({ error: "Failed to remove team member" });
  }
};

