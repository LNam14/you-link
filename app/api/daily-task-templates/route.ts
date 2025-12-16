import { NextRequest } from "next/server";
import { DailyTaskTemplateService } from "@/lib/services/daily-task-template.service";
import { UserService } from "@/lib/services/user.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";

const dailyTaskTemplateService = new DailyTaskTemplateService();
const userService = new UserService();

// GET: Lấy tất cả daily task templates
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);

    const templates = await dailyTaskTemplateService.getAllTemplates();
    return successResponse(templates);
  } catch (error) {
    console.error("Error fetching daily task templates:", error);
    return errorResponse(error as Error);
  }
}

// PUT: Cập nhật toàn bộ daily task templates
export async function PUT(request: NextRequest) {
  try {
    // Require authentication
    const authUser = verifyAuthToken(request);

    // Lấy thông tin đầy đủ của user từ database để kiểm tra position
    const user = await userService.getUserByUsername(authUser.username);
    if (!user) {
      return errorResponse(new Error("User not found"), 404);
    }

    // Chỉ Admin và Leader mới được cập nhật templates
    if (user.role !== "Admin" && user.position !== "Leader") {
      return errorResponse(new Error("Bạn không có quyền cập nhật templates"), 403);
    }

    const body = await request.json();
    const { template } = body;

    if (!template || !Array.isArray(template)) {
      return errorResponse(new Error("Template phải là một mảng"), 400);
    }

    const result = await dailyTaskTemplateService.updateAllTemplates(template);
    return successResponse(result);
  } catch (error) {
    console.error("Error updating daily task templates:", error);
    return errorResponse(error as Error);
  }
}

