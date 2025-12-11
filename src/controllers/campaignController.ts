import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { CampaignStatus } from "@prisma/client";
import { z } from "zod";

const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  pointsPerDollar: z.number().min(0).default(1.0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  pointsPerDollar: z.number().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const createCampaign = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const data = createCampaignSchema.parse(req.body);

    const campaign = await prisma.campaign.create({
      data: {
        brandId,
        name: data.name,
        description: data.description,
        pointsPerDollar: data.pointsPerDollar,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: CampaignStatus.DRAFT,
      },
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error("Create campaign error:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
};

export const getCampaigns = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;

    const campaigns = await prisma.campaign.findMany({
      where: { brandId },
      include: {
        redemptions: true,
      },
    });

    res.json(campaigns);
  } catch (error) {
    console.error("Get campaigns error:", error);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
};

export const getCampaign = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        redemptions: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json(campaign);
  } catch (error) {
    console.error("Get campaign error:", error);
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
};

export const updateCampaign = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const data = updateCampaignSchema.parse(req.body);

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status) updateData.status = data.status;
    if (data.pointsPerDollar) updateData.pointsPerDollar = data.pointsPerDollar;
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    res.json(campaign);
  } catch (error) {
    console.error("Update campaign error:", error);
    res.status(500).json({ error: "Failed to update campaign" });
  }
};

export const deleteCampaign = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    await prisma.campaign.delete({
      where: { id: campaignId },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Delete campaign error:", error);
    res.status(500).json({ error: "Failed to delete campaign" });
  }
};
