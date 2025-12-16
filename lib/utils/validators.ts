import { ValidationError } from "./errors";
import { CreateUserDto, CreateTeamDto } from "../types";

export function validateCreateUser(data: Partial<CreateUserDto>): void {
  // No validation - all fields are optional
  // Allow empty values for all fields
}

export function validateCreateTeam(data: Partial<CreateTeamDto>): void {
  // No validation - all fields are optional
  // Allow empty values for all fields
}

