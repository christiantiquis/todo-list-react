export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  category?: string; // Made category field optional
  createdAt: number; // Added createdAt field to store timestamp
  updatedAt?: number; // Added updatedAt field for last edit timestamp
  completedAt?: number; // Added completedAt field for completion timestamp
  dueDate?: number; // Added dueDate field for task deadlines
};