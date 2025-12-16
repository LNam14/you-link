import { NextRequest } from "next/server";
import { PenaltyService } from "@/lib/services/penalty.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";

const penaltyService = new PenaltyService();

/**
 * POST /api/penalties/weekly
 * Xử phạt công việc tuần (tuần trước)
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);

    const result = await penaltyService.penalizeWeeklyTasks();

    return successResponse({
      message: `Đã xử phạt ${result.penalized} nhân viên`,
      penalized: result.penalized,
      totalAmount: result.totalAmount,
      details: result.details,
    });
  } catch (error) {
    console.error("Error penalizing weekly tasks:", error);
    return errorResponse(error as Error);
  }
}

