export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  pending?: boolean; // Task is on hold until resumed
  category?: string; // Made category field optional
  createdAt: number; // Added createdAt field to store timestamp
  updatedAt?: number; // Added updatedAt field for last edit timestamp
  completedAt?: number; // Added completedAt field for completion timestamp
  dueDate?: number; // Added dueDate field for task deadlines
  agent?: string; // Agent that created or claimed this task
  priority?: "high" | "medium" | "low";
  note?: string; // Optional longer detail for this task
  finishedBy?: string; // Agent that completed or deleted this task
};
