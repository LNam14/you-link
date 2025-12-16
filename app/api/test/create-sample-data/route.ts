import { NextRequest } from "next/server";
import { WorkTaskService } from "@/lib/services/work-task.service";
import { DailyTaskTemplateService } from "@/lib/services/daily-task-template.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";
import { WeekData, DailyTaskData } from "@/lib/repositories/work-task.repository";

const workTaskService = new WorkTaskService();
const dailyTaskTemplateService = new DailyTaskTemplateService();

/**
 * POST /api/test/create-sample-data
 * Tạo dữ liệu mẫu cho test xử phạt
 * 
 * Body:
 * {
 *   "username": "BH20",
 *   "date": "2025-12-15", // Ngày chưa hoàn thành
 *   "weekNumber": 51 // Tuần chưa hoàn thành
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);

    // Parse body với error handling
    let body: any = {};
    try {
      const bodyText = await request.text();
      if (bodyText && bodyText.trim().length > 0) {
        body = JSON.parse(bodyText);
      }
    } catch (parseError) {
      // Nếu không parse được, sử dụng giá trị mặc định
      console.warn("Could not parse request body, using defaults:", parseError);
    }

    const username = body.username || "BH20";
    const date = body.date || "2025-12-15";

    // Tính số tuần của năm từ ngày (phải giống logic trong PenaltyService)
    const getWeekNumber = (date: Date): number => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    };

    // Tính toán date range cho tuần chứa ngày
    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() + daysToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Tính weekNumber từ ngày (KHÔNG dùng từ body, phải tính từ ngày)
    const weekNumber = getWeekNumber(dateObj);
    
    console.log(`[Create Sample Data] Date: ${date}, WeekNumber: ${weekNumber}, WeekKey: ${weekNumber.toString()}`);

    // Lấy daily task template để biết có những task nào
    const templateData = await dailyTaskTemplateService.getAllTemplates();
    const dailyTaskTemplate = templateData.template || [];

    const formatDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

    // Tạo dailyTasks cho cả tuần (từ thứ 2 đến chủ nhật)
    const dailyTasks: DailyTaskData[] = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);
      const dateStr = formatDate(currentDate);
      const dayName = dayNames[currentDate.getDay()];

      const dailyTask: DailyTaskData = {
        day: dayName,
        date: dateStr,
        chamCong: false,
      };

      // Thêm các task từ template (chưa hoàn thành)
      dailyTaskTemplate.forEach((templateTask) => {
        if (templateTask.type === "boolean") {
          dailyTask[templateTask.id] = false; // Chưa hoàn thành
        } else {
          dailyTask[templateTask.id] = []; // Chưa có dữ liệu
        }
      });

      dailyTasks.push(dailyTask);
    }

    // Tạo WeekData với công việc chưa hoàn thành
    const weekData: WeekData = {
      dateRange: {
        from: formatDate(monday),
        to: formatDate(sunday),
      },
      weeklyTasks: [
        // Có thể thêm một số công việc tuần chưa hoàn thành
        {
          id: 1,
          title: "Công việc khác",
          content: "Công việc test",
          status: "pending",
          employeeNote: "", // Chưa hoàn thành
        },
      ],
      deXuat: ["", "", ""], // Chưa hoàn thành 3 đề xuất
      dailyTasks,
    };

    // Lưu dữ liệu
    const result = await workTaskService.createOrUpdateWorkTask(
      username,
      weekNumber.toString(),
      weekData
    );

    return successResponse({
      message: `Đã tạo dữ liệu mẫu cho ${username}`,
      username,
      weekNumber,
      date,
      weekData: {
        dateRange: weekData.dateRange,
        dailyTasksCount: weekData.dailyTasks.length,
        deXuatCount: weekData.deXuat.filter((d) => d && d.trim().length > 0).length,
        weeklyTasksCount: weekData.weeklyTasks.length,
      },
      taskId: result.id,
    });
  } catch (error) {
    console.error("Error creating sample data:", error);
    return errorResponse(error as Error);
  }
}

