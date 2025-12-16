import { BaseRepository } from "./base.repository";
import { User } from "../types";

export class UserRepository extends BaseRepository<User> {
  protected collectionName = "users";

  async findByUsername(username: string): Promise<User | null> {
    return this.findByField("username", username);
  }

  async getNextId(): Promise<number> {
    try {
      const users = await this.findAll();

      if (users.length === 0) {
        return 1;
      }

      const maxId = Math.max(...users.map((user) => user.id));
      return maxId + 1;
    } catch (error) {
      console.error("Error getting next user id:", error);
      throw error;
    }
  }
}

