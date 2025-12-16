import { DailyTaskTemplateRepository, DailyTaskTemplate } from "../repositories/daily-task-template.repository";
import { NotFoundError } from "../utils/errors";
import { getCurrentDateTime } from "../utils/date";

export interface CreateDailyTaskTemplateDto {
  name: string;
  type: "boolean" | "text";
  appliesTo?: string[];
}

export interface UpdateDailyTaskTemplateDto {
  name?: string;
  type?: "boolean" | "text";
  appliesTo?: string[];
}

export class DailyTaskTemplateService {
  private repository: DailyTaskTemplateRepository;

  constructor() {
    this.repository = new DailyTaskTemplateRepository();
  }

  async getAllTemplates(): Promise<{ template: DailyTaskTemplate[] }> {
    return this.repository.findAllAsObject();
  }

  async getTemplateById(id: string): Promise<DailyTaskTemplate | null> {
    return this.repository.findById(id);
  }

  async createTemplate(data: CreateDailyTaskTemplateDto): Promise<DailyTaskTemplate> {
    // Normalize name to create ID
    const normalizedId = data.name
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    // Check if template with same id exists
    const existing = await this.repository.findById(normalizedId);
    if (existing) {
      throw new Error("Template với tên này đã tồn tại");
    }

    const newTemplate: DailyTaskTemplate = {
      id: normalizedId,
      name: data.name.trim(),
      type: data.type,
      // Nếu appliesTo rỗng hoặc undefined thì không set (áp dụng cho tất cả)
      appliesTo: data.appliesTo && data.appliesTo.length > 0 ? data.appliesTo : undefined,
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
    };

    return this.repository.create(newTemplate);
  }

  async updateTemplate(id: string, data: UpdateDailyTaskTemplateDto): Promise<DailyTaskTemplate> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Daily task template");
    }

    // Build update object, only including defined fields
    const updateData: Partial<DailyTaskTemplate> = {};
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.type !== undefined) {
      updateData.type = data.type;
    }
    if (data.appliesTo !== undefined) {
      // Cho phép appliesTo là mảng rỗng hoặc undefined (áp dụng cho tất cả)
      updateData.appliesTo = data.appliesTo.length === 0 ? undefined : data.appliesTo;
    }

    return this.repository.update(id, updateData);
  }

  // Cập nhật toàn bộ templates (dùng cho API update)
  async updateAllTemplates(templates: DailyTaskTemplate[]): Promise<{ template: DailyTaskTemplate[] }> {
    await this.repository.saveAllTemplates(templates);
    return { template: templates };
  }

  async deleteTemplate(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Daily task template");
    }
    return this.repository.delete(id);
  }
}

