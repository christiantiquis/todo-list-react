"use client";

import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, Save, X, Info, CalendarIcon } from "lucide-react"; // Import CalendarIcon
import { Todo } from "@/types/todo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Import Popover components
import { Calendar } from "@/components/ui/calendar"; // Import Calendar component
import { format } from "date-fns"; // Import format from date-fns

type TodoItemProps = {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string, newCategory: string, newDueDate?: number) => void; // Updated onEdit prop
  onUpdateCategory: (id: string, newCategory: string) => void;
  availableCategories: string[];
};

export function TodoItem({ todo, onToggle, onDelete, onEdit, onUpdateCategory, availableCategories }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(todo.text);
  const [editedCategory, setEditedCategory] = useState(todo.category || "none");
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(
    todo.dueDate ? new Date(todo.dueDate) : undefined
  );

  const handleSaveEdit = () => {
    if (editedText.trim() === "") {
      // Optionally show a toast error here if text is empty
      return;
    }
    onEdit(
      todo.id,
      editedText.trim(),
      editedCategory,
      editedDueDate ? editedDueDate.getTime() : undefined
    );
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(todo.text);
    setEditedCategory(todo.category || "none");
    setEditedDueDate(todo.dueDate ? new Date(todo.dueDate) : undefined);
    setIsEditing(false);
  };

  // Helper function to format date for display
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex items-center justify-between p-3 border-b last:border-b-0">
      <div className="flex items-center space-x-3 flex-grow">
        <Checkbox
          id={`todo-${todo.id}`}
          checked={todo.completed}
          onCheckedChange={() => onToggle(todo.id)}
          disabled={isEditing}
        />
        {isEditing ? (
          <>
            <Input
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSaveEdit();
                }
              }}
              className="flex-grow"
            />
            <Select onValueChange={setEditedCategory} value={editedCategory}>
              <SelectTrigger className="w-[120px] ml-2">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto z-50">
                <SelectItem value="none">No Category</SelectItem>
                {availableCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[120px] justify-start text-left font-normal ml-2",
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
          </>
        ) : (
          <label
            htmlFor={`todo-${todo.id}`}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              todo.completed && "line-through text-muted-foreground"
            )}
          >
            {todo.text}
          </label>
        )}
        {todo.category && !isEditing && (
          <Badge variant="secondary" className="ml-2">
            {todo.category}
          </Badge>
        )}
        {todo.dueDate && !isEditing && (
          <Badge variant="outline" className="ml-2 text-xs">
            Due: {format(new Date(todo.dueDate), "MMM d")}
          </Badge>
        )}
      </div>
      <div className="flex space-x-1 ml-2">
        {isEditing ? (
          <>
            <Button variant="ghost" size="icon" onClick={handleSaveEdit} aria-label="Save changes">
              <Save className="h-4 w-4 text-primary" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCancelEdit} aria-label="Cancel edit">
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </>
        ) : (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Todo details">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Added: {formatDate(todo.createdAt)}</p>
                  {todo.updatedAt && <p>Updated: {formatDate(todo.updatedAt)}</p>}
                  {todo.completedAt && <p>Completed: {formatDate(todo.completedAt)}</p>}
                  {todo.dueDate && <p>Due: {formatDate(todo.dueDate)}</p>} {/* Display due date */}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              aria-label="Edit todo"
              disabled={todo.completed}
            >
              <Pencil className={cn("h-4 w-4", todo.completed ? "text-muted-foreground" : "text-muted-foreground")} />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete todo"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    "{todo.text}" todo item.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(todo.id)}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}