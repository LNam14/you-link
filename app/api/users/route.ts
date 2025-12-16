import { NextRequest } from "next/server";
import { UserService } from "@/lib/services/user.service";
import { validateCreateUser } from "@/lib/utils/validators";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";
import { CreateUserDto } from "@/lib/types";

const userService = new UserService();

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);
    
    const users = await userService.getAllUsers();
    return successResponse(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return errorResponse(error as Error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);
    
    const body: CreateUserDto = await request.json();
    
    // Validation
    validateCreateUser(body);
    
    const newUser = await userService.createUser(body);
    return successResponse(newUser, 201);
  } catch (error) {
    console.error("Error creating user:", error);
    return errorResponse(error as Error);
  }
}

