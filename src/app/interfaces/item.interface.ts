export interface ItemCategories {
  categoryId: number;
  name: string;
}

export interface Item {
  itemId: number;
  description: string;
  completed: boolean;
  categories: string[];
  dateAdded?: Date;
  dateCompleted?: Date;
  dateDue?: Date;
  dateUpdated?: Date;
}
