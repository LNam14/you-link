import { BaseRepository } from "./base.repository";
import { Customer } from "../types";

export class CustomerRepository extends BaseRepository<Customer> {
  protected collectionName = "customers";

  async findByMaMoi(maMoi: string): Promise<Customer | null> {
    return this.findByField("ma_moi", maMoi);
  }

  async getNextId(): Promise<number> {
    try {
      const customers = await this.findAll();

      if (customers.length === 0) {
        return 1;
      }

      const maxId = Math.max(...customers.map((customer) => customer.id));
      return maxId + 1;
    } catch (error) {
      console.error("Error getting next customer id:", error);
      throw error;
    }
  }
}

