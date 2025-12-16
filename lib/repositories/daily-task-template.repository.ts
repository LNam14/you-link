import { BaseRepository } from "./base.repository";
import { ref, get, set } from "firebase/database";

export interface DailyTaskTemplate {
  id: string;
  name: string;
  type: "boolean" | "text";
  appliesTo?: string[]; // Danh sách username của nhân viên áp dụng. Nếu undefined hoặc rỗng thì áp dụng cho tất cả
  createdAt?: string;
  updatedAt?: string;
}

export class DailyTaskTemplateRepository extends BaseRepository<DailyTaskTemplate> {
  protected collectionName = "dailyTaskTemplates";

  // Lấy tất cả templates dưới dạng object với key là id
  async findAllAsObject(): Promise<{ template: DailyTaskTemplate[] }> {
    try {
      const collectionRef = this.getCollectionRef();
      const snapshot = await get(collectionRef);

      if (!snapshot.exists()) {
        return { template: [] };
      }

      const data = snapshot.val();
      const templates: DailyTaskTemplate[] = [];

      snapshot.forEach((childSnapshot) => {
        templates.push(childSnapshot.val() as DailyTaskTemplate);
      });

      return { template: templates };
    } catch (error) {
      console.error("Error getting all daily task templates:", error);
      throw error;
    }
  }

  // Lưu toàn bộ templates
  async saveAllTemplates(templates: DailyTaskTemplate[]): Promise<void> {
    try {
      const collectionRef = this.getCollectionRef();
      const templatesObject: { [key: string]: DailyTaskTemplate } = {};
      
      templates.forEach((template) => {
        templatesObject[template.id] = template;
      });

      await set(collectionRef, templatesObject);
    } catch (error) {
      console.error("Error saving all daily task templates:", error);
      throw error;
    }
  }
}

