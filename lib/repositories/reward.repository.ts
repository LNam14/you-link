import { BaseRepository } from "./base.repository";
import { ref, get } from "firebase/database";

export interface Reward {
  id?: string;
  username: string;
  year: number;
  month: number;
  amount: number; // Số tiền phần thưởng (dương)
  site: string; // Site được cập nhật
  reason: string; // Lý do phần thưởng (ví dụ: "Cập nhật site")
  createdAt: string;
}

export class RewardRepository extends BaseRepository<Reward> {
  protected collectionName = "rewards";

  /**
   * Lấy tất cả phần thưởng của một user trong tháng
   */
  async getRewardsByUserAndMonth(
    username: string,
    year: number,
    month: number
  ): Promise<Reward[]> {
    try {
      const collectionRef = this.getCollectionRef();
      const snapshot = await get(collectionRef);

      if (!snapshot.exists()) {
        return [];
      }

      const allRewards: Reward[] = [];
      snapshot.forEach((childSnapshot) => {
        const reward = childSnapshot.val() as Reward;
        if (
          reward.username === username &&
          reward.year === year &&
          reward.month === month
        ) {
          allRewards.push({
            ...reward,
            id: childSnapshot.key || undefined,
          });
        }
      });

      return allRewards;
    } catch (error) {
      console.error("Error getting rewards by user and month:", error);
      throw error;
    }
  }

  /**
   * Lấy tổng số tiền phần thưởng của một user trong tháng
   */
  async getTotalRewardByUserAndMonth(
    username: string,
    year: number,
    month: number
  ): Promise<number> {
    try {
      const rewards = await this.getRewardsByUserAndMonth(
        username,
        year,
        month
      );
      return rewards.reduce((sum, reward) => sum + reward.amount, 0);
    } catch (error) {
      console.error("Error getting total reward:", error);
      return 0;
    }
  }
}

