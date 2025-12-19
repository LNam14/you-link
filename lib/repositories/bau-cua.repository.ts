import { getDatabaseInstance } from "../config/firebase";
import { ref, get, set } from "firebase/database";

export type AnimalType = "bau" | "ca" | "cua" | "ga" | "huou" | "tom";

export interface BauCuaChoice {
  animal: AnimalType;
  fullname: string;
  username: string;
  timestamp: string;
  date: string;
}

export interface BauCuaData {
  [date: string]: {
    [username: string]: BauCuaChoice;
  };
}

export class BauCuaRepository {
  private collectionName = "bauCua";
  private db = getDatabaseInstance();

  private getCollectionRef() {
    return ref(this.db, this.collectionName);
  }

  private getDateRef(date: string) {
    return ref(this.db, `${this.collectionName}/${date}`);
  }

  private getUserRef(date: string, username: string) {
    return ref(this.db, `${this.collectionName}/${date}/${username}`);
  }

  /**
   * Lấy lựa chọn của một user trong một ngày
   */
  async getUserChoice(date: string, username: string): Promise<BauCuaChoice | null> {
    try {
      const userRef = this.getUserRef(date, username);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.val() as BauCuaChoice;
    } catch (error) {
      console.error(`Error getting user choice for ${username} on ${date}:`, error);
      throw error;
    }
  }

  /**
   * Lưu lựa chọn của user
   */
  async saveChoice(choice: BauCuaChoice): Promise<void> {
    try {
      const userRef = this.getUserRef(choice.date, choice.username);
      await set(userRef, choice);
    } catch (error) {
      console.error(`Error saving choice for ${choice.username} on ${choice.date}:`, error);
      throw error;
    }
  }

  /**
   * Lấy tất cả lựa chọn trong một ngày
   */
  async getChoicesByDate(date: string): Promise<BauCuaChoice[]> {
    try {
      const dateRef = this.getDateRef(date);
      const snapshot = await get(dateRef);

      if (!snapshot.exists()) {
        return [];
      }

      const data = snapshot.val() as { [username: string]: BauCuaChoice };
      return Object.values(data);
    } catch (error) {
      console.error(`Error getting choices for date ${date}:`, error);
      throw error;
    }
  }

  /**
   * Lấy thống kê theo con vật trong một ngày
   */
  async getStatisticsByDate(date: string): Promise<{
    [animal in AnimalType]: {
      count: number;
      users: Array<{ fullname: string; username: string }>;
    };
  }> {
    try {
      const choices = await this.getChoicesByDate(date);
      
      const stats: {
        [animal in AnimalType]: {
          count: number;
          users: Array<{ fullname: string; username: string }>;
        };
      } = {
        bau: { count: 0, users: [] },
        ca: { count: 0, users: [] },
        cua: { count: 0, users: [] },
        ga: { count: 0, users: [] },
        huou: { count: 0, users: [] },
        tom: { count: 0, users: [] },
      };

      choices.forEach((choice) => {
        if (stats[choice.animal]) {
          stats[choice.animal].count++;
          stats[choice.animal].users.push({
            fullname: choice.fullname,
            username: choice.username,
          });
        }
      });

      return stats;
    } catch (error) {
      console.error(`Error getting statistics for date ${date}:`, error);
      throw error;
    }
  }
}

