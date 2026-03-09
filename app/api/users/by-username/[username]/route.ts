import { NextRequest } from "next/server";
import { UserService } from "@/lib/services/user.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";

const userService = new UserService();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    verifyAuthToken(request);

    const { username } = await params;

    if (!username || typeof username !== "string" || !username.trim()) {
      return errorResponse(new Error("Invalid username"), 400);
    }

    await userService.deleteUserByUsername(decodeURIComponent(username));
    return successResponse({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return errorResponse(error as Error);
  }
}
