import { NextRequest } from "next/server";
import { TeamService } from "@/lib/services/team.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";
import { UpdateTeamDto } from "@/lib/types";

const teamService = new TeamService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyAuthToken(request);
    
    const { id } = await params;
    const team = await teamService.getTeamById(id);
    return successResponse(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    return errorResponse(error as Error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyAuthToken(request);
    
    const { id } = await params;
    const body: UpdateTeamDto = await request.json();

    const updatedTeam = await teamService.updateTeam(id, body);
    return successResponse(updatedTeam);
  } catch (error) {
    console.error("Error updating team:", error);
    return errorResponse(error as Error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyAuthToken(request);
    
    const { id } = await params;

    await teamService.deleteTeam(id);
    return successResponse({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("Error deleting team:", error);
    return errorResponse(error as Error);
  }
}

