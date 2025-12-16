import { NextRequest } from "next/server";
import { TeamService } from "@/lib/services/team.service";
import { validateCreateTeam } from "@/lib/utils/validators";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";
import { CreateTeamDto } from "@/lib/types";

const teamService = new TeamService();

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);
    
    const teams = await teamService.getAllTeams();
    return successResponse(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return errorResponse(error as Error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);
    
    const body: CreateTeamDto = await request.json();
    
    // Validation
    validateCreateTeam(body);
    
    const newTeam = await teamService.createTeam(body);
    return successResponse(newTeam, 201);
  } catch (error) {
    console.error("Error creating team:", error);
    return errorResponse(error as Error);
  }
}

