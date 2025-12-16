import { BaseRepository } from "./base.repository";
import { ref, get, set } from "firebase/database";

export interface AttendanceData {
  [username: string]: {
    [date: string]: "checked"; // Chỉ lưu ngày đã chấm, format: "YYYY-MM-DD"
  };
}

export class AttendanceRepository extends BaseRepository<AttendanceData> {
  protected collectionName = "attendance";

  // Lấy tất cả dữ liệu chấm công
  async getAllAttendance(): Promise<AttendanceData> {
    try {
      const collectionRef = this.getCollectionRef();
      const snapshot = await get(collectionRef);

      if (!snapshot.exists()) {
        return {};
      }

      return snapshot.val() as AttendanceData;
    } catch (error) {
      console.error("Error getting all attendance:", error);
      throw error;
    }
  }

  // Lấy dữ liệu chấm công của một user
  async getAttendanceByUsername(username: string): Promise<{ [date: string]: "checked" }> {
    try {
      const userRef = ref(this.db, `${this.collectionName}/${username}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        return {};
      }

      return snapshot.val() as { [date: string]: "checked" };
    } catch (error) {
      console.error(`Error getting attendance for ${username}:`, error);
      throw error;
    }
  }

  // Lưu hoặc cập nhật dữ liệu chấm công
  async saveAttendance(username: string, date: string): Promise<void> {
    try {
      const userRef = ref(this.db, `${this.collectionName}/${username}/${date}`);
      await set(userRef, "checked");
    } catch (error) {
      console.error(`Error saving attendance for ${username} on ${date}:`, error);
      throw error;
    }
  }

  // Lưu toàn bộ dữ liệu chấm công
  async saveAllAttendance(data: AttendanceData): Promise<void> {
    try {
      const collectionRef = this.getCollectionRef();
      await set(collectionRef, data);
    } catch (error) {
      console.error("Error saving all attendance:", error);
      throw error;
    }
  }
}

