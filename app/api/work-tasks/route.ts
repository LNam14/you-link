import { NextRequest } from "next/server";
import { WorkTaskService } from "@/lib/services/work-task.service";
import { UserService } from "@/lib/services/user.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";

const workTaskService = new WorkTaskService();
const userService = new UserService();

// GET: Lấy tất cả dữ liệu (work tasks, attendance, daily task templates, auth)
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);

    const allData = await workTaskService.getAllData();
    return successResponse(allData);
  } catch (error) {
    console.error("Error fetching work tasks:", error);
    return errorResponse(error as Error);
  }
}

// POST: Tạo mới work task
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authUser = verifyAuthToken(request);

    const body = await request.json();
    const { username, weekNumber, weekData } = body;

    if (!username || !weekNumber || !weekData) {
      return errorResponse(new Error("Username, weekNumber và weekData là bắt buộc"), 400);
    }

    // Lấy thông tin đầy đủ của user từ database để kiểm tra position
    const user = await userService.getUserByUsername(authUser.username);
    if (!user) {
      return errorResponse(new Error("User not found"), 404);
    }

    // Chỉ cho phép user tạo work task cho chính họ, trừ khi là Admin/Leader
    if (user.role !== "Admin" && user.position !== "Leader" && authUser.username !== username) {
      return errorResponse(new Error("Bạn không có quyền tạo work task cho user khác"), 403);
    }

    const result = await workTaskService.createOrUpdateWorkTask(username, weekNumber, weekData);
    return successResponse(result, 201);
  } catch (error) {
    console.error("Error creating work task:", error);
    return errorResponse(error as Error);
  }
}

// PUT: Cập nhật work task
export async function PUT(request: NextRequest) {
  try {
    // Require authentication
    const authUser = verifyAuthToken(request);

    const body = await request.json();
    const { id, username, weekNumber, weekData } = body;

    if (!id || !username || !weekNumber || !weekData) {
      return errorResponse(new Error("Id, username, weekNumber và weekData là bắt buộc"), 400);
    }

    // Lấy thông tin đầy đủ của user từ database để kiểm tra position
    const user = await userService.getUserByUsername(authUser.username);
    if (!user) {
      return errorResponse(new Error("User not found"), 404);
    }

    // Chỉ cho phép user cập nhật work task cho chính họ, trừ khi là Admin/Leader
    if (user.role !== "Admin" && user.position !== "Leader" && authUser.username !== username) {
      return errorResponse(new Error("Bạn không có quyền cập nhật work task cho user khác"), 403);
    }

    await workTaskService.updateWorkTask(id, username, weekNumber, weekData);
    return successResponse({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Error updating work task:", error);
    return errorResponse(error as Error);
  }
}

