import { BaseRepository } from "./base.repository";
import { ref, get, set } from "firebase/database";

export interface WeeklyTaskData {
  id: number;
  title: string;
  content: string;
  status?: "pending" | "success" | "failed";
  employeeNote?: string;
}

export interface DailyTaskData {
  day: string;
  date: string;
  chamCong: boolean;
  [key: string]: boolean | string[] | string;
}

export interface WeekData {
  dateRange: {
    from: string;
    to: string;
  };
  weeklyTasks: WeeklyTaskData[];
  deXuat: string[];
  dailyTasks: DailyTaskData[];
}

export interface UserWeekData {
  weeks: { [weekNumber: string]: WeekData };
}

export interface WorkTaskData {
  users: { [username: string]: UserWeekData };
  taskIds: { [key: string]: number }; // Key format: "username_weekNumber"
}

export class WorkTaskRepository extends BaseRepository<WorkTaskData> {
  protected collectionName = "workTasks";

  // Lấy tất cả dữ liệu work tasks
  async getAllWorkTasks(): Promise<WorkTaskData> {
    try {
      const collectionRef = this.getCollectionRef();
      const snapshot = await get(collectionRef);

      if (!snapshot.exists()) {
        return {
          users: {},
          taskIds: {},
        };
      }

      return snapshot.val() as WorkTaskData;
    } catch (error: any) {
      // Nếu lỗi permission, trả về dữ liệu rỗng thay vì throw error
      if (error?.code === "PERMISSION_DENIED" || error?.message?.includes("Permission denied")) {
        console.warn("Permission denied accessing workTasks, returning empty data. Please update Firebase rules.");
        return {
          users: {},
          taskIds: {},
        };
      }
      console.error("Error getting all work tasks:", error);
      throw error;
    }
  }

  // Lấy work task của một user cho một tuần cụ thể
  async getWorkTaskByUserAndWeek(
    username: string,
    weekNumber: string
  ): Promise<WeekData | null> {
    try {
      const userRef = ref(
        this.db,
        `${this.collectionName}/users/${username}/weeks/${weekNumber}`
      );
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.val() as WeekData;
    } catch (error) {
      console.error(
        `Error getting work task for ${username} week ${weekNumber}:`,
        error
      );
      throw error;
    }
  }

  // Lưu hoặc cập nhật work task cho một user và tuần
  async saveWorkTask(
    username: string,
    weekNumber: string,
    weekData: WeekData,
    taskId?: number
  ): Promise<number> {
    try {
      // Lưu week data
      const weekRef = ref(
        this.db,
        `${this.collectionName}/users/${username}/weeks/${weekNumber}`
      );
      await set(weekRef, weekData);

      // Lưu task ID nếu có
      if (taskId !== undefined) {
        const taskKey = `${username}_${weekNumber}`;
        const taskIdsRef = ref(
          this.db,
          `${this.collectionName}/taskIds/${taskKey}`
        );
        await set(taskIdsRef, taskId);
        return taskId;
      }

      // Nếu chưa có taskId, lấy từ taskIds hiện tại hoặc tạo mới
      const taskIdsRef = ref(this.db, `${this.collectionName}/taskIds`);
      let taskIds: { [key: string]: number } = {};
      
      try {
        const taskIdsSnapshot = await get(taskIdsRef);
        taskIds = taskIdsSnapshot.exists()
          ? (taskIdsSnapshot.val() as { [key: string]: number })
          : {};
      } catch (error: any) {
        // Nếu không đọc được taskIds (permission denied), tạo mới
        if (error?.code === "PERMISSION_DENIED" || error?.message?.includes("Permission denied")) {
          console.warn("Permission denied reading taskIds, creating new ID");
          taskIds = {};
        } else {
          throw error;
        }
      }

      const taskKey = `${username}_${weekNumber}`;
      if (!taskIds[taskKey]) {
        // Tạo ID mới
        const maxId = Object.keys(taskIds).length > 0 ? Math.max(...Object.values(taskIds), 0) : 0;
        const newId = maxId + 1;
        taskIds[taskKey] = newId;
        try {
          await set(taskIdsRef, taskIds);
        } catch (error: any) {
          // Nếu không ghi được, vẫn trả về ID đã tạo
          if (error?.code === "PERMISSION_DENIED" || error?.message?.includes("Permission denied")) {
            console.warn("Permission denied writing taskIds, but ID was generated:", newId);
          } else {
            throw error;
          }
        }
        return newId;
      }

      return taskIds[taskKey];
    } catch (error: any) {
      // Nếu lỗi permission, vẫn cố gắng trả về một ID mặc định
      if (error?.code === "PERMISSION_DENIED" || error?.message?.includes("Permission denied")) {
        console.warn("Permission denied saving work task, returning default ID");
        return taskId || 1;
      }
      console.error(
        `Error saving work task for ${username} week ${weekNumber}:`,
        error
      );
      throw error;
    }
  }

  // Lưu toàn bộ work task data
  async saveAllWorkTasks(data: WorkTaskData): Promise<void> {
    try {
      const collectionRef = this.getCollectionRef();
      await set(collectionRef, data);
    } catch (error) {
      console.error("Error saving all work tasks:", error);
      throw error;
    }
  }
}

