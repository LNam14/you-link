import { UserRepository } from "../repositories/user.repository";
import { User, CreateUserDto, UpdateUserDto, UserResponse } from "../types";
import { ConflictError, NotFoundError } from "../utils/errors";
import { getCurrentDateTime } from "../utils/date";

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getAllUsers(): Promise<UserResponse[]> {
    const users = await this.userRepository.findAll();
    return users; // Return users with password included
  }

  async getUserById(id: number): Promise<UserResponse> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User");
    }
    return user; // Return user with password included
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  async createUser(userData: CreateUserDto): Promise<UserResponse> {
    // Check if username already exists (only if username is provided)
    if (userData.username) {
      const existingUser = await this.userRepository.findByUsername(
        String(userData.username || "").trim()
      );
      if (existingUser) {
        throw new ConflictError("Username already exists");
      }
    }

    const nextId = await this.userRepository.getNextId();
    const newUser: User = {
      ...userData,
      id: nextId,
      username: String(userData.username || "").trim(),
      password: String(userData.password || "").trim(),
      fullname: String(userData.fullname || "").trim(),
      role: String(userData.role || "").trim(),
      position: String(userData.position || "").trim(),
      telegram: userData.telegram ? String(userData.telegram).trim() : "",
      active: userData.active !== undefined ? userData.active : true,
      team: userData.team ? String(userData.team).trim() : "",
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
    };

    await this.userRepository.create(newUser, nextId);
    return newUser; // Return user with password included
  }

  async updateUser(id: number, userData: Partial<CreateUserDto>): Promise<UserResponse> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError("User");
    }

    // If username is being updated, check if it's already taken
    if (userData.username && userData.username !== existingUser.username) {
      const existingUsername = await this.userRepository.findByUsername(
        String(userData.username || "").trim()
      );
      if (existingUsername) {
        throw new ConflictError("Username already exists");
      }
    }

    const updateData: any = {};
    if (userData.username !== undefined) updateData.username = String(userData.username || "").trim();
    if (userData.password !== undefined) updateData.password = String(userData.password || "").trim();
    if (userData.fullname !== undefined) updateData.fullname = String(userData.fullname || "").trim();
    if (userData.role !== undefined) updateData.role = String(userData.role || "").trim();
    if (userData.position !== undefined) updateData.position = String(userData.position || "").trim();
    if (userData.telegram !== undefined) updateData.telegram = userData.telegram ? String(userData.telegram).trim() : "";
    if (userData.active !== undefined) updateData.active = userData.active;
    if (userData.team !== undefined) {
      // Handle team: can be string, null, or empty string
      if (userData.team === null) {
        updateData.team = "";
      } else {
        updateData.team = String(userData.team).trim();
      }
    }

    const updatedUser = await this.userRepository.update(id, updateData);
    return updatedUser as UserResponse; // Return user with password included
  }

  async deleteUser(id: number): Promise<void> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError("User");
    }

    await this.userRepository.delete(id);
  }

  private excludePassword(user: User): UserResponse {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

