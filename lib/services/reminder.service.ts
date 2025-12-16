import { WorkTaskService } from "./work-task.service";
import { TelegramService } from "./telegram.service";

interface UserInfo {
  username: string;
  fullname: string;
  telegram?: string;
}

interface DailyReminderResult {
  completed: UserInfo[];
  incomplete: UserInfo[];
}

interface WeeklyReminderResult {
  deXuat: {
    completed: UserInfo[];
    incomplete: UserInfo[];
  };
  weeklyTasks: {
    [taskContent: string]: {
      completed: UserInfo[];
      incomplete: UserInfo[];
    };
  };
}

export class ReminderService {
  private workTaskService: WorkTaskService;
  private telegramService: TelegramService;

  constructor() {
    this.workTaskService = new WorkTaskService();
    this.telegramService = new TelegramService();
  }

  /**
   * Lấy ngày hôm nay theo format YYYY-MM-DD (local timezone)
   */
  private getTodayLocal(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
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
   * Lấy thứ 2 và chủ nhật của tuần hiện tại
   */
  private getCurrentWeekDates() {
    const today = new Date();
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return {
      monday,
      sunday,
      weekNumber: this.getWeekNumber(monday),
    };
  }

  /**
   * Format thời gian còn lại trong ngày
   */
  private formatTimeRemainingInDay(): string {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    const diff = endOfDay.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours} giờ ${minutes} phút`;
  }

  /**
   * Format thời gian còn lại đến cuối tuần
   */
  private formatTimeRemainingInWeek(sunday: Date): string {
    const now = new Date();
    const diff = sunday.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days} ngày ${hours} giờ`;
  }

  /**
   * Format datetime theo format: HH:mm:ss DD/MM/YYYY
   */
  private formatDateTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
  }

  /**
   * Format date theo format: DD/MM/YYYY
   */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }

  /**
   * Kiểm tra công việc hàng ngày đã hoàn thành chưa
   */
  private isDailyTaskCompleted(dailyTask: any, today: string): boolean {
    if (!dailyTask) return false;
    
    // Kiểm tra xem có dữ liệu nào được điền không (ngoài date, day, chamCong)
    const keys = Object.keys(dailyTask).filter(
      (key) => key !== "date" && key !== "day" && key !== "chamCong"
    );
    
    if (keys.length === 0) return false;
    
    // Kiểm tra từng task
    for (const key of keys) {
      const value = dailyTask[key];
      
      // Nếu là boolean, phải là true
      if (typeof value === "boolean") {
        if (value === true) return true;
      }
      
      // Nếu là array, phải có ít nhất 1 phần tử không rỗng
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
   * Kiểm tra công việc tuần đã hoàn thành chưa
   */
  private isWeeklyTaskCompleted(task: any): boolean {
    if (!task) return false;
    return task.employeeNote && task.employeeNote.trim().length > 0;
  }

  /**
   * Kiểm tra nhân viên có công việc hàng ngày không
   */
  private hasDailyTasks(user: any, dailyTaskTemplate: any[]): boolean {
    if (!dailyTaskTemplate || dailyTaskTemplate.length === 0) return false;
    
    // Kiểm tra xem có công việc nào áp dụng cho nhân viên này không
    for (const task of dailyTaskTemplate) {
      const appliesToUser = !task.appliesTo || 
                            task.appliesTo.length === 0 || 
                            task.appliesTo.includes(user.username);
      
      if (appliesToUser) {
        return true; // Có ít nhất 1 công việc áp dụng
      }
    }
    
    return false;
  }

  /**
   * Lấy danh sách nhân viên cần nhắc nhở công việc hàng ngày
   */
  async getDailyReminderUsers(): Promise<DailyReminderResult> {
    const allData = await this.workTaskService.getAllData();
    const today = this.getTodayLocal();
    const weekNumber = this.getWeekNumber(new Date());
    const weekKey = weekNumber.toString();

    const completed: UserInfo[] = [];
    const incomplete: UserInfo[] = [];

    // Lấy daily task template để kiểm tra công việc
    const dailyTaskTemplate = allData.dailyTaskTemplate?.template || [];

    // Lấy danh sách users từ auth data - CHỈ lấy role "Nhân viên" (group "NV")
    const users: { [username: string]: UserInfo } = {};
    if (allData.auth && allData.auth.data) {
      // Chỉ lấy từ group "NV" (Nhân viên), không lấy Admin
      if (allData.auth.data.NV && Array.isArray(allData.auth.data.NV)) {
        allData.auth.data.NV.forEach((user: any) => {
          // Chỉ lấy users có role "Nhân viên"
          if (user.username && user.role === "Nhân viên") {
            // Chỉ thêm nếu user có công việc hàng ngày
            if (this.hasDailyTasks(user, dailyTaskTemplate)) {
              users[user.username] = {
                username: user.username,
                fullname: user.fullname || user.username,
                telegram: user.telegram || user.phone,
              };
            }
          }
        });
      }
    }

    // Kiểm tra từng user
    if (allData.workTask && allData.workTask.users) {
      for (const username of Object.keys(users)) {
        const userData = allData.workTask.users[username];
        if (!userData || !userData.weeks || !userData.weeks[weekKey]) {
          incomplete.push(users[username]);
          continue;
        }

        const weekData = userData.weeks[weekKey];
        const todayTask = weekData.dailyTasks?.find((task: any) => task.date === today);

        if (this.isDailyTaskCompleted(todayTask, today)) {
          completed.push(users[username]);
        } else {
          incomplete.push(users[username]);
        }
      }
    } else {
      // Nếu không có dữ liệu work task, tất cả đều chưa hoàn thành
      incomplete.push(...Object.values(users));
    }

    return { completed, incomplete };
  }

  /**
   * Lấy danh sách nhân viên cần nhắc nhở công việc tuần
   */
  async getWeeklyReminderUsers(): Promise<WeeklyReminderResult> {
    const allData = await this.workTaskService.getAllData();
    const { weekNumber, sunday } = this.getCurrentWeekDates();
    const weekKey = weekNumber.toString();

    const result: WeeklyReminderResult = {
      deXuat: {
        completed: [],
        incomplete: [],
      },
      weeklyTasks: {},
    };

    // Lấy danh sách users từ auth data - CHỈ lấy role "Nhân viên" (group "NV")
    const users: { [username: string]: UserInfo } = {};
    if (allData.auth && allData.auth.data) {
      // Chỉ lấy từ group "NV" (Nhân viên), không lấy Admin
      if (allData.auth.data.NV && Array.isArray(allData.auth.data.NV)) {
        allData.auth.data.NV.forEach((user: any) => {
          // Chỉ lấy users có role "Nhân viên"
          if (user.username && user.role === "Nhân viên") {
            // Tất cả nhân viên đều có công việc tuần (đề xuất bắt buộc)
            users[user.username] = {
              username: user.username,
              fullname: user.fullname || user.username,
              telegram: user.telegram || user.phone,
            };
          }
        });
      }
    }

    // Kiểm tra từng user
    if (allData.workTask && allData.workTask.users) {
      for (const username of Object.keys(users)) {
        const userData = allData.workTask.users[username];
        if (!userData || !userData.weeks || !userData.weeks[weekKey]) {
          // Chưa có dữ liệu tuần này
          result.deXuat.incomplete.push(users[username]);
          continue;
        }

        const weekData = userData.weeks[weekKey];

        // Kiểm tra đề xuất
        if (this.isDeXuatCompleted(weekData.deXuat)) {
          result.deXuat.completed.push(users[username]);
        } else {
          result.deXuat.incomplete.push(users[username]);
        }

        // Kiểm tra công việc khác
        if (weekData.weeklyTasks && Array.isArray(weekData.weeklyTasks)) {
          weekData.weeklyTasks.forEach((task: any) => {
            if (task.content && task.content.trim().length > 0) {
              const taskContent = task.content.trim();
              if (!result.weeklyTasks[taskContent]) {
                result.weeklyTasks[taskContent] = {
                  completed: [],
                  incomplete: [],
                };
              }

              if (this.isWeeklyTaskCompleted(task)) {
                result.weeklyTasks[taskContent].completed.push(users[username]);
              } else {
                result.weeklyTasks[taskContent].incomplete.push(users[username]);
              }
            }
          });
        }
      }
    } else {
      // Nếu không có dữ liệu work task, tất cả đều chưa hoàn thành
      result.deXuat.incomplete.push(...Object.values(users));
    }

    return result;
  }

  /**
   * Format danh sách users cho tin nhắn
   */
  private formatUserList(users: UserInfo[]): string {
    if (users.length === 0) return "";
    
    return users
      .map((user) => {
        const telegram = user.telegram 
          ? user.telegram.replace("@", "") 
          : user.username;
        return `  • ${user.username}-${user.fullname} @${telegram}`;
      })
      .join("\n");
  }

  /**
   * Kiểm tra nhân viên có công việc cụ thể chưa hoàn thành không
   */
  private hasIncompleteTaskForUser(
    user: UserInfo,
    taskId: string,
    todayTask: any
  ): boolean {
    if (!todayTask) return true; // Chưa có dữ liệu ngày hôm nay
    
    const taskValue = todayTask[taskId];
    
    // Nếu là boolean, phải là true
    if (typeof taskValue === "boolean") {
      return taskValue !== true;
    }
    
    // Nếu là array, phải có ít nhất 1 phần tử không rỗng
    if (Array.isArray(taskValue)) {
      return !(taskValue.length > 0 && taskValue.some((item) => item && item.trim().length > 0));
    }
    
    // Nếu không có giá trị, coi như chưa hoàn thành
    return true;
  }

  /**
   * Gửi nhắc nhở công việc hàng ngày
   */
  async sendDailyReminder(chatId: string = "-1003124919874_156"): Promise<void> {
    const allData = await this.workTaskService.getAllData();
    const reminderData = await this.getDailyReminderUsers();
    const now = new Date();
    const timeRemaining = this.formatTimeRemainingInDay();

    // Nếu tất cả đã hoàn thành, gửi tin nhắn chúc mừng
    if (reminderData.incomplete.length === 0) {
      const completedCount = reminderData.completed.length;
      const message = `🎉 Chúc mừng!\n\n` +
        `✨ Tất cả ${completedCount} nhân viên đã hoàn thành công việc hàng ngày!\n\n` +
        `👏 Cảm ơn các bạn đã hoàn thành tốt công việc. Tiếp tục phát huy nhé! 💪\n\n` +
        `⏰ Thời gian: ${this.formatDateTime(now)}`;
      
      await this.telegramService.sendMessage({
        chatId,
        message,
      });
      return;
    }

    // Lấy daily task template
    const dailyTaskTemplate = allData.dailyTaskTemplate?.template || [];
    const today = this.getTodayLocal();
    const weekNumber = this.getWeekNumber(new Date());
    const weekKey = weekNumber.toString();

    // Phân loại nhân viên theo từng công việc
    const tasksByJob: { [taskName: string]: UserInfo[] } = {};

    // Với mỗi công việc trong template
    for (const task of dailyTaskTemplate) {
      // Sử dụng name (từ repository) hoặc fullname (từ frontend) hoặc id
      const taskName = (task as any).fullname || task.name || task.id;
      const incompleteUsers: UserInfo[] = [];

      // Kiểm tra từng nhân viên chưa hoàn thành
      for (const user of reminderData.incomplete) {
        // Kiểm tra xem công việc này có áp dụng cho nhân viên này không
        const appliesToUser = !task.appliesTo || 
                              task.appliesTo.length === 0 || 
                              task.appliesTo.includes(user.username);

        if (!appliesToUser) continue;

        // Kiểm tra xem nhân viên này có công việc này chưa hoàn thành không
        if (allData.workTask && allData.workTask.users && allData.workTask.users[user.username]) {
          const userData = allData.workTask.users[user.username];
          if (userData.weeks && userData.weeks[weekKey]) {
            const weekData = userData.weeks[weekKey];
            const todayTask = weekData.dailyTasks?.find((t: any) => t.date === today);
            
            if (this.hasIncompleteTaskForUser(user, task.id, todayTask)) {
              incompleteUsers.push(user);
            }
          } else {
            // Chưa có dữ liệu tuần này, coi như chưa hoàn thành
            incompleteUsers.push(user);
          }
        } else {
          // Chưa có dữ liệu, coi như chưa hoàn thành
          incompleteUsers.push(user);
        }
      }

      // Chỉ thêm vào danh sách nếu có nhân viên chưa hoàn thành
      if (incompleteUsers.length > 0) {
        tasksByJob[taskName] = incompleteUsers;
      }
    }

    // Nếu không có công việc nào trong template, hiển thị danh sách chung
    if (Object.keys(tasksByJob).length === 0) {
      let message = `🔔 Nhắc nhở làm công việc hàng ngày\n\n`;
      message += `⏰ Thời gian nhắc nhở: ${this.formatDateTime(now)}\n`;
      message += `⏳ Thời gian còn lại trong ngày: ${timeRemaining}\n\n`;
      message += `Danh sách nhân viên chưa hoàn thành:\n${this.formatUserList(reminderData.incomplete)}\n\n`;
      message += `⚠️ Vui lòng hoàn thành công việc hàng ngày của bạn trong ${timeRemaining}!`;

      await this.telegramService.sendMessage({
        chatId,
        message,
      });
      return;
    }

    // Tạo tin nhắn theo từng công việc
    let message = `🔔 Nhắc nhở làm công việc hàng ngày\n\n`;
    message += `⏰ Thời gian nhắc nhở: ${this.formatDateTime(now)}\n`;
    message += `⏳ Thời gian còn lại trong ngày: ${timeRemaining}\n\n`;

    // Hiển thị từng công việc và danh sách nhân viên
    for (const [taskName, users] of Object.entries(tasksByJob)) {
      message += `${taskName}:\n${this.formatUserList(users)}\n\n`;
    }

    message += `⚠️ Vui lòng hoàn thành công việc hàng ngày của bạn trong ${timeRemaining}!`;

    await this.telegramService.sendMessage({
      chatId,
      message,
    });
  }

  /**
   * Gửi nhắc nhở công việc tuần
   */
  async sendWeeklyReminder(chatId: string = "-1003124919874_156"): Promise<void> {
    const reminderData = await this.getWeeklyReminderUsers();
    const now = new Date();
    const { sunday } = this.getCurrentWeekDates();
    const timeRemaining = this.formatTimeRemainingInWeek(sunday);

    let hasIncomplete = false;

    // Kiểm tra đề xuất
    if (reminderData.deXuat.incomplete.length > 0) {
      hasIncomplete = true;
    }

    // Kiểm tra công việc khác
    for (const taskContent of Object.keys(reminderData.weeklyTasks)) {
      if (reminderData.weeklyTasks[taskContent].incomplete.length > 0) {
        hasIncomplete = true;
        break;
      }
    }

    // Nếu tất cả đã hoàn thành, gửi tin nhắn chúc mừng
    if (!hasIncomplete) {
      const completedDeXuat = reminderData.deXuat.completed.length;
      let completedWeeklyTasks = 0;
      for (const taskContent of Object.keys(reminderData.weeklyTasks)) {
        completedWeeklyTasks += reminderData.weeklyTasks[taskContent].completed.length;
      }
      
      const message = `🎉 Chúc mừng!\n\n` +
        `✨ Tất cả nhân viên đã hoàn thành công việc tuần!\n\n` +
        `✅ Đề xuất: ${completedDeXuat} nhân viên đã hoàn thành\n` +
        `✅ Công việc khác: ${completedWeeklyTasks} nhân viên đã hoàn thành\n\n` +
        `👏 Cảm ơn các bạn đã hoàn thành tốt công việc. Tiếp tục phát huy nhé! 💪\n\n` +
        `⏰ Thời gian: ${this.formatDateTime(now)}\n` +
        `📅 Tuần kết thúc: ${this.formatDate(sunday)}`;
      
      await this.telegramService.sendMessage({
        chatId,
        message,
      });
      return;
    }

    let message = `🔔 Nhắc nhở làm công việc tuần\n\n`;
    message += `⏰ Thời gian nhắc nhở: ${this.formatDateTime(now)}\n`;
    message += `📅 Tuần kết thúc: ${this.formatDate(sunday)}\n`;
    message += `⏳ Thời gian còn lại: ${timeRemaining}\n\n`;

    // Đề xuất
    if (reminderData.deXuat.incomplete.length > 0) {
      message += `Đề xuất:\n${this.formatUserList(reminderData.deXuat.incomplete)}\n\n`;
    }

    // Công việc khác
    for (const taskContent of Object.keys(reminderData.weeklyTasks)) {
      const taskData = reminderData.weeklyTasks[taskContent];
      if (taskData.incomplete.length > 0) {
        message += `Công việc khác: ${taskContent}:\n${this.formatUserList(taskData.incomplete)}\n\n`;
      }
    }

    message += `⚠️ Vui lòng hoàn thành công việc tuần của bạn trong ${timeRemaining}!`;

    await this.telegramService.sendMessage({
      chatId,
      message,
    });
  }
}

