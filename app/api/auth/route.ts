import { NextRequest } from "next/server";
import { WorkTaskService } from "@/lib/services/work-task.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";

const workTaskService = new WorkTaskService();

// GET: Lấy dữ liệu auth (tất cả users được nhóm theo role)
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);

    const authData = await workTaskService.getAuthData();
    return successResponse(authData);
  } catch (error) {
    console.error("Error fetching auth data:", error);
    return errorResponse(error as Error);
  }
}

