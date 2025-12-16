import { NextRequest } from "next/server";
import { UserService } from "@/lib/services/user.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";
import { UpdateUserDto } from "@/lib/types";

const userService = new UserService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyAuthToken(request);
    
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return errorResponse(new Error("Invalid user ID"), 400);
    }

    const user = await userService.getUserById(id);
    return successResponse(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return errorResponse(error as Error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyAuthToken(request);
    
    const { id: idParam } = await params;
    const body: UpdateUserDto = await request.json();
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return errorResponse(new Error("Invalid user ID"), 400);
    }

    const updatedUser = await userService.updateUser(id, body);
    return successResponse(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return errorResponse(error as Error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyAuthToken(request);
    
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return errorResponse(new Error("Invalid user ID"), 400);
    }

    await userService.deleteUser(id);
    return successResponse({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return errorResponse(error as Error);
  }
}

