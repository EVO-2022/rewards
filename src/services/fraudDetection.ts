import { prisma } from "../utils/prisma";
import { FraudSeverity, FraudStatus } from "@prisma/client";
import { rewardsEngine } from "./rewardsEngine";

export class FraudDetectionService {
  /**
   * Check velocity - too many mints in short time
   */
  async checkVelocity(
    brandId: string,
    userId: string,
    windowMinutes: number = 60
  ): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const recentMints = await prisma.rewardLedger.count({
      where: {
        brandId,
        userId,
        type: "MINT",
        createdAt: {
          gte: windowStart,
        },
      },
    });

    // Flag if more than 10 mints in the window
    return recentMints > 10;
  }

  /**
   * Check for suspiciously large mint amounts
   */
  async checkLargeAmount(
    _brandId: string,
    amount: number,
    threshold: number = 10000
  ): Promise<boolean> {
    return amount > threshold;
  }

  /**
   * Create fraud flag
   */
  async createFraudFlag(
    userId: string,
    brandId: string | null,
    severity: FraudSeverity,
    reason: string,
    details?: Record<string, any>
  ) {
    return await prisma.fraudFlag.create({
      data: {
        userId,
        brandId,
        severity,
        reason,
        details: details || {},
        status: FraudStatus.PENDING,
      },
    });
  }

  /**
   * Review fraud flag
   */
  async reviewFraudFlag(flagId: string, reviewerId: string, status: FraudStatus) {
    return await prisma.fraudFlag.update({
      where: { id: flagId },
      data: {
        status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Run fraud checks before minting
   */
  async runFraudChecks(brandId: string, userId: string, amount: number) {
    const checks = {
      velocity: false,
      largeAmount: false,
    };

    checks.velocity = await this.checkVelocity(brandId, userId);
    checks.largeAmount = await this.checkLargeAmount(brandId, amount);

    if (checks.velocity) {
      await this.createFraudFlag(
        userId,
        brandId,
        FraudSeverity.MEDIUM,
        "High velocity minting detected",
        { amount, brandId }
      );
    }

    if (checks.largeAmount) {
      await this.createFraudFlag(
        userId,
        brandId,
        FraudSeverity.HIGH,
        "Unusually large mint amount detected",
        { amount, brandId }
      );
    }

    return checks;
  }
}

export const fraudDetection = new FraudDetectionService();
