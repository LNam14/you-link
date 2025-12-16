import { UserService } from "./user.service";
import { LoginDto, LoginResponse, AuthUser } from "../types/auth.types";
import { NotFoundError, ValidationError } from "../utils/errors";
import { generateToken } from "../utils/jwt";

export class AuthService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async login(loginData: LoginDto): Promise<LoginResponse> {
    // Validate input - login still requires username and password
    const username = loginData.username ? String(loginData.username).trim() : "";
    const password = loginData.password ? String(loginData.password).trim() : "";
    
    if (!username) {
      throw new ValidationError("Username is required", "username");
    }

    if (!password) {
      throw new ValidationError("Password is required", "password");
    }

    // Find user by username
    const user = await this.userService.getUserByUsername(username);

    if (!user) {
      throw new NotFoundError("User");
    }

    // Check if user is active
    if (!user.active) {
      throw new ValidationError("User account is inactive", "active");
    }

    // Verify password (simple comparison for now, can upgrade to bcrypt later)
    if (user.password !== password) {
      throw new ValidationError("Invalid username or password", "credentials");
    }

    // Create auth user object (without password)
    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      role: user.role,
      position: user.position,
      telegram: user.telegram,
      active: user.active,
      team: user.team,
    };

    // Generate JWT token
    const token = generateToken(authUser);

    return {
      user: authUser,
      token,
    };
  }

  async getCurrentUser(userId: number): Promise<AuthUser> {
    const user = await this.userService.getUserById(userId);
    
    return {
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      role: user.role,
      position: user.position,
      telegram: user.telegram,
      active: user.active,
      team: user.team,
    };
  }
}

