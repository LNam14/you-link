import { BaseRepository } from "./base.repository";
import { ref, get, query, orderByChild, equalTo } from "firebase/database";

export interface Penalty {
  id?: string;
  username: string;
  year: number;
  month: number;
  penaltyType: "daily" | "weekly";
  date?: string; // Ngày bị phạt (cho daily)
  weekNumber?: number; // Tuần bị phạt (cho weekly)
  amount: number; // Số tiền phạt (âm)
  reason: string; // Lý do phạt
  createdAt: string;
}

export class PenaltyRepository extends BaseRepository<Penalty> {
  protected collectionName = "penalties";

  /**
   * Lấy tất cả phạt của một user trong tháng
   */
  async getPenaltiesByUserAndMonth(
    username: string,
    year: number,
    month: number
  ): Promise<Penalty[]> {
    try {
      const collectionRef = this.getCollectionRef();
      const snapshot = await get(collectionRef);

      if (!snapshot.exists()) {
        return [];
      }

      const allPenalties: Penalty[] = [];
      snapshot.forEach((childSnapshot) => {
        const penalty = childSnapshot.val() as Penalty;
        if (
          penalty.username === username &&
          penalty.year === year &&
          penalty.month === month
        ) {
          allPenalties.push({
            ...penalty,
            id: childSnapshot.key || undefined,
          });
        }
      });

      return allPenalties;
    } catch (error) {
      console.error("Error getting penalties by user and month:", error);
      throw error;
    }
  }

  /**
   * Lấy tổng số tiền phạt của một user trong tháng
   */
  async getTotalPenaltyByUserAndMonth(
    username: string,
    year: number,
    month: number
  ): Promise<number> {
    try {
      const penalties = await this.getPenaltiesByUserAndMonth(
        username,
        year,
        month
      );
      return penalties.reduce((sum, penalty) => sum + penalty.amount, 0);
    } catch (error) {
      console.error("Error getting total penalty:", error);
      throw error;
    }
  }

  /**
   * Kiểm tra đã phạt cho ngày/tuần này chưa
   */
  async hasPenaltyForDateOrWeek(
    username: string,
    penaltyType: "daily" | "weekly",
    dateOrWeek: string | number,
    year: number,
    month: number
  ): Promise<boolean> {
    try {
      const penalties = await this.getPenaltiesByUserAndMonth(
        username,
        year,
        month
      );

      if (penaltyType === "daily") {
        return penalties.some(
          (p) => p.penaltyType === "daily" && p.date === dateOrWeek
        );
      } else {
        return penalties.some(
          (p) => p.penaltyType === "weekly" && p.weekNumber === dateOrWeek
        );
      }
    } catch (error) {
      console.error("Error checking penalty:", error);
      return false;
    }
  }
}

