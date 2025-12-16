import { getDatabaseInstance } from "../config/firebase";
import { ref, get, set, push } from "firebase/database";
import { getCurrentDateTime } from "../utils/date";

export abstract class BaseRepository<T> {
  protected abstract collectionName: string;
  protected db = getDatabaseInstance();

  protected getCollectionRef() {
    return ref(this.db, this.collectionName);
  }

  protected getItemRef(id: string | number) {
    return ref(this.db, `${this.collectionName}/${id}`);
  }

  async findAll(): Promise<T[]> {
    try {
      const collectionRef = this.getCollectionRef();
      const snapshot = await get(collectionRef);

      if (!snapshot.exists()) {
        return [];
      }

      const items: T[] = [];
      snapshot.forEach((childSnapshot) => {
        items.push(childSnapshot.val() as T);
      });

      return items;
    } catch (error) {
      console.error(`Error getting all ${this.collectionName}:`, error);
      throw error;
    }
  }

  async findById(id: string | number): Promise<T | null> {
    try {
      const itemRef = this.getItemRef(id);
      const snapshot = await get(itemRef);

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.val() as T;
    } catch (error) {
      console.error(`Error getting ${this.collectionName} by id:`, error);
      throw error;
    }
  }

  async create(data: T, id?: string | number): Promise<T> {
    try {
      // Remove undefined fields before saving to Firebase
      const cleanData = this.removeUndefinedFields(data);
      
      if (id) {
        const itemRef = this.getItemRef(id);
        await set(itemRef, cleanData);
        return cleanData as T;
      } else {
        const collectionRef = this.getCollectionRef();
        const newItemRef = push(collectionRef);
        const newId = newItemRef.key;

        if (!newId) {
          throw new Error("Failed to generate ID");
        }

        await set(newItemRef, cleanData);
        return cleanData as T;
      }
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw error;
    }
  }

  async update(id: string | number, data: Partial<T>): Promise<T> {
    try {
      const itemRef = this.getItemRef(id);
      const snapshot = await get(itemRef);

      if (!snapshot.exists()) {
        throw new Error(`${this.collectionName} not found`);
      }

      const existingData = snapshot.val() as T;
      // Remove undefined fields from update data before merging
      const cleanUpdateData = this.removeUndefinedFields(data);
      const updatedData = {
        ...existingData,
        ...cleanUpdateData,
        updatedAt: getCurrentDateTime(),
      };

      await set(itemRef, updatedData);
      return updatedData as T;
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Helper method to remove undefined fields from an object
  private removeUndefinedFields(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedFields(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          if (value !== undefined) {
            cleaned[key] = this.removeUndefinedFields(value);
          }
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  async delete(id: string | number): Promise<void> {
    try {
      const itemRef = this.getItemRef(id);
      const snapshot = await get(itemRef);

      if (!snapshot.exists()) {
        throw new Error(`${this.collectionName} not found`);
      }

      await set(itemRef, null);
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  protected async findByField(field: string, value: any): Promise<T | null> {
    try {
      // Get all items and filter in memory to avoid needing Firebase index
      const allItems = await this.findAll();
      const item = allItems.find((item: any) => item[field] === value);
      return item || null;
    } catch (error) {
      console.error(`Error finding ${this.collectionName} by ${field}:`, error);
      throw error;
    }
  }
}

