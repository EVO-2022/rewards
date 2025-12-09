import { prisma } from "../utils/prisma";
import { LedgerType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export class RewardsEngine {
  /**
   * Mint points (simulate ERC-20 mint)
   */
  async mintPoints(
    brandId: string,
    userId: string,
    amount: number,
    reason: string,
    metadata?: Record<string, any>
  ) {
    return await prisma.rewardLedger.create({
      data: {
        brandId,
        userId,
        type: LedgerType.MINT,
        amount: new Decimal(amount),
        reason,
        metadata: metadata || {},
      },
    });
  }

  /**
   * Burn points (simulate ERC-20 burn)
   */
  async burnPoints(
    brandId: string,
    userId: string,
    amount: number,
    reason: string,
    metadata?: Record<string, any>
  ) {
    return await prisma.rewardLedger.create({
      data: {
        brandId,
        userId,
        type: LedgerType.BURN,
        amount: new Decimal(amount),
        reason,
        metadata: metadata || {},
      },
    });
  }

  /**
   * Get user balance (mint - burn)
   */
  async getUserBalance(brandId: string, userId: string): Promise<number> {
    const mints = await prisma.rewardLedger.aggregate({
      where: {
        brandId,
        userId,
        type: LedgerType.MINT,
      },
      _sum: {
        amount: true,
      },
    });

    const burns = await prisma.rewardLedger.aggregate({
      where: {
        brandId,
        userId,
        type: LedgerType.BURN,
      },
      _sum: {
        amount: true,
      },
    });

    const mintTotal = mints._sum.amount?.toNumber() || 0;
    const burnTotal = burns._sum.amount?.toNumber() || 0;

    return Math.max(0, mintTotal - burnTotal);
  }

  /**
   * Check if user has sufficient balance
   */
  async hasSufficientBalance(brandId: string, userId: string, requiredAmount: number): Promise<boolean> {
    const balance = await this.getUserBalance(brandId, userId);
    return balance >= requiredAmount;
  }
}

export const rewardsEngine = new RewardsEngine();

