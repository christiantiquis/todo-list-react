"use client";

import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, Save, X, Info, CalendarIcon } from "lucide-react";
import { categoryValue, deadline, priorityLabel } from "@/lib/todo-store";
import type { Todo } from "@/types/todo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

type TodoItemProps = {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string, newCategory: string, newDueDate: number | undefined, newPriority: string, expected: Todo) => Promise<boolean>;
  now: Date;
  availableCategories: string[];
};

export function TodoItem({ todo, onToggle, onDelete, onEdit, now, availableCategories }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [original, setOriginal] = useState(todo);
  const [saving, setSaving] = useState(false);
  const [editedText, setEditedText] = useState(todo.text);
  const [editedCategory, setEditedCategory] = useState(todo.category ? categoryValue(todo.category) : "none");
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(
    todo.dueDate !== undefined ? new Date(todo.dueDate) : undefined
  );
  const [editedPriority, setEditedPriority] = useState(todo.priority ?? "none");

  const [error, setError] = useState("");
  const dueStatus = deadline(todo, now);

  const handleSaveEdit = async () => {
    if (saving) return;
    if (editedText.trim() === "") {
      setError("Task text cannot be empty.");
      return;
    }
    setError("");
    setSaving(true);
    const saved = await onEdit(
      todo.id,
      editedText.trim(),
      availableCategories.some(name => categoryValue(name) === editedCategory) ? editedCategory : "none",
      editedDueDate ? editedDueDate.getTime() : undefined,
      editedPriority,
      original
    );
    setSaving(false);
    if (saved) setIsEditing(false);
    else setError("Could not save your edit. Your draft is kept. Cancel to load the latest task, then try again.");
  };

  const handleCancelEdit = () => {
    setEditedText(todo.text);
    setEditedCategory(todo.category ? categoryValue(todo.category) : "none");
    setEditedDueDate(todo.dueDate !== undefined ? new Date(todo.dueDate) : undefined);
    setEditedPriority(todo.priority ?? "none");
    setError("");
    setIsEditing(false);
  };

  // Helper function to format date for display
  const formatDate = (timestamp?: number) => {
    if (timestamp === undefined) return "N/A";
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="group flex min-w-0 flex-col gap-2 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <Checkbox
          id={`todo-${todo.id}`}
          checked={todo.completed}
          onCheckedChange={() => onToggle(todo.id)}
          disabled={isEditing}
          aria-label={`Mark ${todo.text} ${todo.completed ? "active" : "complete"}`}
        />
        {isEditing ? (
          <>
            <Input
              aria-label="Edit task text"
              aria-invalid={!!error}
              aria-describedby={error ? `error-${todo.id}` : undefined}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveEdit();
                }
              }}
              className="min-w-0 flex-1 basis-full"
            />
            {error && <p id={`error-${todo.id}`} role="alert" className="w-full text-sm text-destructive">{error}</p>}
            <Select onValueChange={setEditedCategory} value={availableCategories.some(name => categoryValue(name) === editedCategory) ? editedCategory : "none"}>
              <SelectTrigger aria-label="Edit task category" className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto z-50">
                <SelectItem value="none">No Category</SelectItem>
                {availableCategories.map(category => (
                  <SelectItem key={category} value={categoryValue(category)}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  aria-label="Edit task due date"
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-auto justify-start text-left font-normal",
                    !editedDueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editedDueDate ? format(editedDueDate, "PPP") : <span>Due Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={editedDueDate}
                  onSelect={setEditedDueDate}
                  initialFocus
                />
                {editedDueDate && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" onClick={() => setEditedDueDate(undefined)} className="w-full">
                      Clear Due Date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <Select value={editedPriority} onValueChange={setEditedPriority}>
              <SelectTrigger aria-label="Edit task priority" className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </>
        ) : (
          <label
            htmlFor={`todo-${todo.id}`}
            className={cn(
              "min-w-0 flex-1 basis-3/4 break-words text-sm font-medium leading-relaxed",
              todo.completed && "line-through text-muted-foreground"
            )}
          >
            {todo.text}
          </label>
        )}
        {todo.category && !isEditing && (
          <Badge variant="secondary" className="max-w-full break-all">
            {todo.category}
          </Badge>
        )}
        {todo.agent && !isEditing && (
          <Badge variant="outline" className="max-w-full break-all" aria-label={`Agent ${todo.agent}`}>
            {todo.agent}
          </Badge>
        )}
        {todo.priority && !isEditing && (
          <Badge variant={todo.priority === "high" ? "destructive" : todo.priority === "medium" ? "secondary" : "outline"} className="text-xs" aria-label={`Priority ${priorityLabel(todo.priority)}`}>
            {priorityLabel(todo.priority)}
          </Badge>
        )}
        {todo.dueDate !== undefined && !isEditing && (
          <Badge variant={dueStatus === "overdue" ? "destructive" : "outline"} className="text-xs">
            {dueStatus === "overdue" ? "Overdue:" : dueStatus === "today" ? "Today:" : "Due:"} {format(new Date(todo.dueDate), "MMM d")}
          </Badge>
        )}
      </div>
      <div className="flex shrink-0 items-start justify-end gap-0.5">
        {isEditing ? (
          <>
            <Button variant="ghost" size="icon" onClick={handleSaveEdit} disabled={saving} aria-label="Save changes">
              <Save className="h-4 w-4 text-primary" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCancelEdit} disabled={saving} aria-label="Cancel edit">
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </>
        ) : (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Details for ${todo.text}`}><Info className="h-4 w-4" /></Button>
              </PopoverTrigger>
              <PopoverContent aria-label="Task details" className="text-sm">
                <p>Added: {formatDate(todo.createdAt)}</p>
                {todo.agent && <p>Agent: {todo.agent}</p>}
                {todo.priority && <p>Priority: {priorityLabel(todo.priority)}</p>}
                {todo.finishedBy && <p>Finished by: {todo.finishedBy}</p>}
                {todo.updatedAt !== undefined && <p>Updated: {formatDate(todo.updatedAt)}</p>}
                {todo.completedAt !== undefined && <p>Completed: {formatDate(todo.completedAt)}</p>}
                {todo.dueDate !== undefined && <p>Due: {formatDate(todo.dueDate)}</p>}
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setOriginal(todo);
                setEditedText(todo.text);
                setEditedCategory(todo.category ? categoryValue(todo.category) : "none");
                setEditedDueDate(todo.dueDate === undefined ? undefined : new Date(todo.dueDate));
                setEditedPriority(todo.priority ?? "none");
                setError(""); setIsEditing(true);
              }}
              aria-label="Edit todo"
              disabled={todo.completed}
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Delete ${todo.text}`} onClick={() => onDelete(todo.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}