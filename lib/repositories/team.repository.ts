import { BaseRepository } from "./base.repository";
import { Team } from "../types";

export class TeamRepository extends BaseRepository<Team> {
  protected collectionName = "teams";

  async findByName(name: string): Promise<Team | null> {
    return this.findByField("name", name);
  }
}

