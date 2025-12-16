import { WorkTaskRepository, WeekData, WorkTaskData } from "../repositories/work-task.repository";
import { AttendanceService } from "./attendance.service";
import { DailyTaskTemplateService } from "./daily-task-template.service";
import { AuthService } from "./auth.service";
import { getCurrentDateTime } from "../utils/date";

export class WorkTaskService {
  private workTaskRepository: WorkTaskRepository;
  private attendanceService: AttendanceService;
  private dailyTaskTemplateService: DailyTaskTemplateService;
  private authService: AuthService;

  constructor() {
    this.workTaskRepository = new WorkTaskRepository();
    this.attendanceService = new AttendanceService();
    this.dailyTaskTemplateService = new DailyTaskTemplateService();
    this.authService = new AuthService();
  }

  // Lấy tất cả dữ liệu (work tasks, attendance, daily task templates, auth)
  async getAllData(): Promise<{
    workTask: WorkTaskData;
    attendance: any[];
    dailyTaskTemplate: { template: any[] };
    auth: any;
  }> {
    try {
      const [workTask, attendanceData, dailyTaskTemplate, authData] = await Promise.all([
        this.workTaskRepository.getAllWorkTasks(),
        this.attendanceService.getAllAttendance(),
        this.dailyTaskTemplateService.getAllTemplates(),
        this.getAuthData(),
      ]);

      // Convert attendance data to array format
      const attendanceArray: any[] = [];
      Object.keys(attendanceData).forEach((username) => {
        Object.keys(attendanceData[username]).forEach((date) => {
          attendanceArray.push({
            username,
            date,
          });
        });
      });

      return {
        workTask,
        attendance: attendanceArray,
        dailyTaskTemplate,
        auth: authData,
      };
    } catch (error) {
      console.error("Error getting all data:", error);
      throw error;
    }
  }

  // Lấy auth data (tất cả users)
  async getAuthData(): Promise<any> {
    try {
      // Import UserService dynamically to avoid circular dependency
      const { UserService } = await import("./user.service");
      const userService = new UserService();
      const users = await userService.getAllUsers();

      // Group users by role
      const grouped: any = {
        NV: [],
        Admin: [],
        NCC: [],
        KH: [],
      };

      users.forEach((user: any) => {
        const role = user.role || "NV";
        if (grouped[role]) {
          grouped[role].push(user);
        } else {
          grouped.NV.push(user);
        }
      });

      return {
        success: true,
        data: grouped,
      };
    } catch (error) {
      console.error("Error getting auth data:", error);
      throw error;
    }
  }

  // Lấy work task của một user cho một tuần
  async getWorkTaskByUserAndWeek(
    username: string,
    weekNumber: string
  ): Promise<WeekData | null> {
    return this.workTaskRepository.getWorkTaskByUserAndWeek(username, weekNumber);
  }

  // Tạo hoặc cập nhật work task
  async createOrUpdateWorkTask(
    username: string,
    weekNumber: string,
    weekData: WeekData,
    taskId?: number
  ): Promise<{ id: number }> {
    const id = await this.workTaskRepository.saveWorkTask(
      username,
      weekNumber,
      weekData,
      taskId
    );
    return { id };
  }

  // Cập nhật work task
  async updateWorkTask(
    id: number,
    username: string,
    weekNumber: string,
    weekData: WeekData
  ): Promise<WeekData> {
    await this.workTaskRepository.saveWorkTask(username, weekNumber, weekData, id);
    return weekData;
  }
}

