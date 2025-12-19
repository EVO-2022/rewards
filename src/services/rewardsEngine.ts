import { prisma } from "../utils/prisma";
import { LedgerType, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

type TxClient = Prisma.TransactionClient;

export class RewardsEngine {
  /**
   * Mint points (simulate ERC-20 mint)
   * If tx provided, writes inside that transaction.
   */
  async mintPoints(
    brandId: string,
    userId: string,
    amount: number,
    reason: string,
    metadata?: Record<string, any>,
    tx?: TxClient
  ) {
    const db = tx ?? prisma;
    return await db.rewardLedger.create({
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
   * If tx provided, writes inside that transaction.
   */
  async burnPoints(
    brandId: string,
    userId: string,
    amount: number,
    reason: string,
    metadata?: Record<string, any>,
    tx?: TxClient
  ) {
    const db = tx ?? prisma;
    return await db.rewardLedger.create({
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
   * Note: this does NOT lock rows; if you need strict serializable behavior,
   * compute inside a transaction and/or enforce in calling code.
   */
  async getUserBalance(
    brandId: string,
    userId: string,
    tx?: TxClient
  ): Promise<number> {
    const db = tx ?? prisma;

    const mints = await db.rewardLedger.aggregate({
      where: { brandId, userId, type: LedgerType.MINT },
      _sum: { amount: true },
    });

    const burns = await db.rewardLedger.aggregate({
      where: { brandId, userId, type: LedgerType.BURN },
      _sum: { amount: true },
    });

    const mintTotal = mints._sum.amount?.toNumber() || 0;
    const burnTotal = burns._sum.amount?.toNumber() || 0;

    return Math.max(0, mintTotal - burnTotal);
  }

  async hasSufficientBalance(
    brandId: string,
    userId: string,
    requiredAmount: number,
    tx?: TxClient
  ): Promise<boolean> {
    const balance = await this.getUserBalance(brandId, userId, tx);
    return balance >= requiredAmount;
  }
}

export const rewardsEngine = new RewardsEngine();