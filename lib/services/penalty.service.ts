import { PenaltyRepository, Penalty } from "../repositories/penalty.repository";
import { WorkTaskService } from "./work-task.service";
import { UserService } from "./user.service";
import { TelegramService } from "./telegram.service";
import { getCurrentDateTime } from "../utils/date";

export class PenaltyService {
  private penaltyRepository: PenaltyRepository;
  private workTaskService: WorkTaskService;
  private userService: UserService;
  private telegramService: TelegramService;

  constructor() {
    this.penaltyRepository = new PenaltyRepository();
    this.workTaskService = new WorkTaskService();
    this.userService = new UserService();
    this.telegramService = new TelegramService();
  }

  /**
   * Lấy ngày hôm qua theo format YYYY-MM-DD
   */
  private getYesterdayLocal(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, "0");
    const day = String(yesterday.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Tính số tuần của năm từ ngày
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Lấy tuần trước
   */
  private getLastWeek(): { weekNumber: number; year: number; month: number } {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    return {
      weekNumber: this.getWeekNumber(lastWeek),
      year: lastWeek.getFullYear(),
      month: lastWeek.getMonth() + 1,
    };
  }

  /**
   * Kiểm tra có công việc được giao không
   */
  private hasAssignedTasks(dailyTask: any): boolean {
    if (!dailyTask) return false;
    
    const keys = Object.keys(dailyTask).filter(
      (key) => key !== "date" && key !== "day" && key !== "chamCong"
    );
    
    return keys.length > 0;
  }

  /**
   * Kiểm tra công việc hàng ngày đã hoàn thành chưa
   */
  private isDailyTaskCompleted(dailyTask: any): boolean {
    if (!dailyTask) return false;
    
    const keys = Object.keys(dailyTask).filter(
      (key) => key !== "date" && key !== "day" && key !== "chamCong"
    );
    
    if (keys.length === 0) return false;
    
    for (const key of keys) {
      const value = dailyTask[key];
      
      if (typeof value === "boolean") {
        if (value === true) return true;
      }
      
      if (Array.isArray(value)) {
        if (value.length > 0 && value.some((item) => item && item.trim().length > 0)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Kiểm tra đề xuất đã hoàn thành chưa
   */
  private isDeXuatCompleted(deXuat: string[]): boolean {
    if (!deXuat || deXuat.length === 0) return false;
    return deXuat.filter((item) => item && item.trim().length > 0).length === 3;
  }

  /**
   * Xử phạt công việc hàng ngày (ngày hôm qua)
   */
  async penalizeDailyTasks(): Promise<{
    penalized: number;
    totalAmount: number;
    details: Array<{ username: string; fullname: string; amount: number }>;
  }> {
    const yesterday = this.getYesterdayLocal();
    const yesterdayDate = new Date(yesterday + "T00:00:00");
    const year = yesterdayDate.getFullYear();
    const month = yesterdayDate.getMonth() + 1;

    const allData = await this.workTaskService.getAllData();
    const allUsers = await this.userService.getAllUsers();
    const employees = allUsers.filter((user) => user.role === "Nhân viên" && user.active);

    const weekNumber = this.getWeekNumber(yesterdayDate);
    const weekKey = weekNumber.toString();

    console.log(`[Penalty Daily] Ngày hôm qua: ${yesterday}, WeekNumber: ${weekNumber}, WeekKey: ${weekKey}`);
    console.log(`[Penalty Daily] Số nhân viên: ${employees.length}`);

    const penalized: Array<{ username: string; fullname: string; amount: number }> = [];
    const PENALTY_AMOUNT = -200000;

    for (const employee of employees) {
      // Kiểm tra đã phạt chưa
      const alreadyPenalized = await this.penaltyRepository.hasPenaltyForDateOrWeek(
        employee.username,
        "daily",
        yesterday,
        year,
        month
      );

      if (alreadyPenalized) {
        console.log(`[Penalty] ${employee.username} đã bị phạt rồi, bỏ qua`);
        continue;
      }

      // Kiểm tra công việc hàng ngày
      if (allData.workTask && allData.workTask.users && allData.workTask.users[employee.username]) {
        const userData = allData.workTask.users[employee.username];
        const availableWeeks = userData.weeks ? Object.keys(userData.weeks) : [];
        console.log(`[Penalty Daily] ${employee.username}: Có ${availableWeeks.length} tuần dữ liệu:`, availableWeeks);
        
        if (userData.weeks && userData.weeks[weekKey]) {
          const weekData = userData.weeks[weekKey];
          const yesterdayTask = weekData.dailyTasks?.find((task: any) => task.date === yesterday);

          console.log(`[Penalty Daily] ${employee.username}: Tìm thấy weekKey ${weekKey}, yesterdayTask:`, yesterdayTask ? "Có" : "Không");
          
          if (yesterdayTask) {
            const hasTasks = this.hasAssignedTasks(yesterdayTask);
            console.log(`[Penalty Daily] ${employee.username}: hasAssignedTasks = ${hasTasks}`);
            
            if (hasTasks) {
              if (!this.isDailyTaskCompleted(yesterdayTask)) {
                console.log(`[Penalty Daily] ${employee.username}: Có task nhưng chưa hoàn thành, tạo phạt`);
                
                const penalty: Penalty = {
                  username: employee.username,
                  year,
                  month,
                  penaltyType: "daily",
                  date: yesterday,
                  amount: PENALTY_AMOUNT,
                  reason: `Chưa hoàn thành công việc hàng ngày ngày ${yesterday}`,
                  createdAt: getCurrentDateTime(),
                };

                await this.penaltyRepository.create(penalty);
                penalized.push({
                  username: employee.username,
                  fullname: employee.fullname || employee.username,
                  amount: PENALTY_AMOUNT,
                });
              } else {
                console.log(`[Penalty Daily] ${employee.username}: Đã hoàn thành`);
              }
            } else {
              console.log(`[Penalty Daily] ${employee.username}: Không có công việc được giao, bỏ qua`);
            }
          } else {
            console.log(`[Penalty Daily] ${employee.username}: Không có dữ liệu ngày hôm qua, bỏ qua`);
          }
        } else {
          console.log(`[Penalty Daily] ${employee.username}: Không có dữ liệu tuần ${weekKey}, bỏ qua`);
        }
      } else {
        console.log(`[Penalty Daily] ${employee.username}: Không có dữ liệu workTask, bỏ qua`);
      }
    }

    const totalAmount = penalized.reduce((sum, p) => sum + p.amount, 0);

    // Gửi tin nhắn Telegram nếu có người bị phạt
    if (penalized.length > 0) {
      const yesterdayFormatted = `${yesterdayDate.getDate()}/${yesterdayDate.getMonth() + 1}/${yesterdayDate.getFullYear()}`;
      let message = `⚠️ Xử phạt công việc hàng ngày\n\n`;
      message += `📅 Ngày: ${yesterdayFormatted}\n`;
      message += `👥 Số người bị phạt: ${penalized.length}\n`;
      message += `💰 Tổng số tiền phạt: ${Math.abs(totalAmount).toLocaleString("vi-VN")} VNĐ\n\n`;
      message += `Danh sách:\n`;
      
      penalized.forEach((p, index) => {
        // Lấy thông tin Telegram của user
        const user = allUsers.find((u) => u.username === p.username);
        const telegram = user?.telegram || p.username;
        const telegramHandle = telegram.replace("@", "");
        
        message += `${index + 1}. ${p.username}-${p.fullname} @${telegramHandle}: ${Math.abs(p.amount).toLocaleString("vi-VN")} VNĐ\n`;
      });
      
      message += `\n⏰ Thời gian: ${getCurrentDateTime()}`;

      try {
        await this.telegramService.sendMessage({
          chatId: "-1003124919874_191",
          message,
        });
      } catch (telegramError) {
        console.error("Error sending penalty notification to Telegram:", telegramError);
        // Không throw error, chỉ log
      }
    }

    return {
      penalized: penalized.length,
      totalAmount,
      details: penalized,
    };
  }

  /**
   * Xử phạt công việc tuần (tuần trước)
   */
  async penalizeWeeklyTasks(): Promise<{
    penalized: number;
    totalAmount: number;
    details: Array<{ username: string; fullname: string; amount: number; reason: string }>;
  }> {
    const lastWeek = this.getLastWeek();
    const weekKey = lastWeek.weekNumber.toString();

    const allData = await this.workTaskService.getAllData();
    const allUsers = await this.userService.getAllUsers();
    const employees = allUsers.filter((user) => user.role === "Nhân viên" && user.active);

    const penalized: Array<{ username: string; fullname: string; amount: number; reason: string }> = [];
    const PENALTY_AMOUNT = -200000;

    for (const employee of employees) {
      // Kiểm tra đã phạt chưa
      const alreadyPenalized = await this.penaltyRepository.hasPenaltyForDateOrWeek(
        employee.username,
        "weekly",
        lastWeek.weekNumber,
        lastWeek.year,
        lastWeek.month
      );

      if (alreadyPenalized) continue;

      let penaltyCount = 0;
      const reasons: string[] = [];

      // Kiểm tra công việc tuần
      if (allData.workTask && allData.workTask.users && allData.workTask.users[employee.username]) {
        const userData = allData.workTask.users[employee.username];
        if (userData.weeks && userData.weeks[weekKey]) {
          const weekData = userData.weeks[weekKey];

          // Kiểm tra đề xuất (3 đề xuất bắt buộc)
          if (!this.isDeXuatCompleted(weekData.deXuat)) {
            const incompleteCount = 3 - (weekData.deXuat?.filter((item: string) => item && item.trim().length > 0).length || 0);
            penaltyCount += incompleteCount;
            reasons.push(`${incompleteCount} đề xuất chưa hoàn thành`);
          }
        } else {
          // Chưa có dữ liệu tuần này, coi như chưa hoàn thành 3 đề xuất
          penaltyCount += 3;
          reasons.push("3 đề xuất chưa hoàn thành (chưa có dữ liệu)");
        }
      } else {
        // Chưa có dữ liệu, coi như chưa hoàn thành 3 đề xuất
        penaltyCount += 3;
        reasons.push("3 đề xuất chưa hoàn thành (chưa có dữ liệu)");
      }

      // Tạo phạt nếu có
      if (penaltyCount > 0) {
        const totalPenaltyAmount = penaltyCount * PENALTY_AMOUNT;
        const penalty: Penalty = {
          username: employee.username,
          year: lastWeek.year,
          month: lastWeek.month,
          penaltyType: "weekly",
          weekNumber: lastWeek.weekNumber,
          amount: totalPenaltyAmount,
          reason: `Tuần ${lastWeek.weekNumber}: ${reasons.join(", ")}`,
          createdAt: getCurrentDateTime(),
        };

        await this.penaltyRepository.create(penalty);
        penalized.push({
          username: employee.username,
          fullname: employee.fullname || employee.username,
          amount: totalPenaltyAmount,
          reason: penalty.reason,
        });
      }
    }

    const totalAmount = penalized.reduce((sum, p) => sum + p.amount, 0);

    // Gửi tin nhắn Telegram nếu có người bị phạt
    if (penalized.length > 0) {
      let message = `⚠️ Xử phạt công việc tuần\n\n`;
      message += `📅 Tuần ${lastWeek.weekNumber} (${lastWeek.month}/${lastWeek.year})\n`;
      message += `👥 Số người bị phạt: ${penalized.length}\n`;
      message += `💰 Tổng số tiền phạt: ${Math.abs(totalAmount).toLocaleString("vi-VN")} VNĐ\n\n`;
      message += `Danh sách:\n`;
      
      penalized.forEach((p, index) => {
        // Lấy thông tin Telegram của user
        const user = allUsers.find((u) => u.username === p.username);
        const telegram = user?.telegram || p.username;
        const telegramHandle = telegram.replace("@", "");
        
        const penaltyCount = Math.abs(p.amount) / 200000; // Số lần phạt
        message += `${index + 1}. ${p.username}-${p.fullname} @${telegramHandle}: ${penaltyCount} lần (${Math.abs(p.amount).toLocaleString("vi-VN")} VNĐ)\n`;
        message += `   Lý do: ${p.reason}\n`;
      });
      
      message += `\n⏰ Thời gian: ${getCurrentDateTime()}`;

      try {
        await this.telegramService.sendMessage({
          chatId: "-1003124919874_191",
          message,
        });
      } catch (telegramError) {
        console.error("Error sending penalty notification to Telegram:", telegramError);
        // Không throw error, chỉ log
      }
    }

    return {
      penalized: penalized.length,
      totalAmount,
      details: penalized,
    };
  }
}

