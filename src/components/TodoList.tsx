"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TodoItem } from "@/components/TodoItem";
import { Todo } from "@/types/todo";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, CalendarIcon } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const LOCAL_STORAGE_KEY = "todo-list";
const LOCAL_STORAGE_CATEGORIES_KEY = "todo-categories";

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoText, setNewTodoText] = useState("");
  const [selectedCategoryForNewTodo, setSelectedCategoryForNewTodo] =
    useState("none");
  const [selectedDueDateForNewTodo, setSelectedDueDateForNewTodo] = useState<
    Date | undefined
  >(undefined);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("default");
  const [searchTerm, setSearchTerm] = useState(""); // New state for search term
  const [hasMounted, setHasMounted] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  const predefinedCategories = ["Work", "Personal", "Shopping"];
  const allAvailableCategories = [...predefinedCategories, ...customCategories];

  // Load todos and categories from local storage on initial mount
  useEffect(() => {
    try {
      const storedTodos = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedTodos) {
        setTodos(JSON.parse(storedTodos));
      }
      const storedCategories = localStorage.getItem(
        LOCAL_STORAGE_CATEGORIES_KEY
      );
      if (storedCategories) {
        setCustomCategories(JSON.parse(storedCategories));
      }
    } catch (error) {
      console.error("Failed to load data from local storage:", error);
      toast.error("Failed to load saved data.");
    } finally {
      setHasMounted(true);
    }
  }, []);

  // Save todos to local storage whenever the todos state changes
  useEffect(() => {
    if (hasMounted) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(todos));
      } catch (error) {
        console.error("Failed to save todos to local storage:", error);
        toast.error("Failed to save todos.");
      }
    }
  }, [todos, hasMounted]);

  // Save custom categories to local storage whenever the customCategories state changes
  useEffect(() => {
    if (hasMounted) {
      try {
        localStorage.setItem(
          LOCAL_STORAGE_CATEGORIES_KEY,
          JSON.stringify(customCategories)
        );
      } catch (error) {
        console.error("Failed to save categories to local storage:", error);
        toast.error("Failed to save categories.");
      }
    }
  }, [customCategories, hasMounted]);

  const handleAddTodo = () => {
    if (newTodoText.trim() === "") {
      toast.error("Todo text cannot be empty.");
      return;
    }

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false,
      category:
        selectedCategoryForNewTodo === "none"
          ? undefined
          : selectedCategoryForNewTodo,
      createdAt: Date.now(),
      dueDate: selectedDueDateForNewTodo
        ? selectedDueDateForNewTodo.getTime()
        : undefined,
    };
    setTodos((prevTodos) => [...prevTodos, newTodo]);
    setNewTodoText("");
    setSelectedCategoryForNewTodo("none");
    setSelectedDueDateForNewTodo(undefined);
    toast.success("Todo added successfully!");
  };

  const handleToggleTodo = (id: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) => {
        if (todo.id === id) {
          const newCompletedStatus = !todo.completed;
          return {
            ...todo,
            completed: newCompletedStatus,
            completedAt: newCompletedStatus ? Date.now() : undefined,
          };
        }
        return todo;
      })
    );
    toast.info("Todo status updated.");
  };

  const handleDeleteTodo = (id: string) => {
    setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
    toast.success("Todo deleted.");
  };

  const handleEditTodo = (
    id: string,
    newText: string,
    newCategory: string,
    newDueDate?: number
  ) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              text: newText,
              category: newCategory === "none" ? undefined : newCategory,
              dueDate: newDueDate,
              updatedAt: Date.now(),
            }
          : todo
      )
    );
    toast.success("Todo updated successfully!");
  };

  const handleUpdateCategory = (id: string, newCategory: string) => {
    // This function is now redundant as handleEditTodo handles category updates
    // but keeping it for now to avoid breaking existing calls if any.
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              category: newCategory === "none" ? undefined : newCategory,
              updatedAt: Date.now(),
            }
          : todo
      )
    );
    toast.success("Todo category updated!");
  };

  const handleClearCompleted = () => {
    const incompleteTodos = todos.filter((todo) => !todo.completed);
    if (incompleteTodos.length === todos.length) {
      toast.info("No completed todos to clear.");
      return;
    }
    setTodos(incompleteTodos);
    toast.success("Completed todos cleared!");
  };

  const handleAddCategory = () => {
    const trimmedCategory = newCategoryName.trim();
    if (trimmedCategory === "") {
      toast.error("Category name cannot be empty.");
      return;
    }
    if (allAvailableCategories.includes(trimmedCategory)) {
      toast.error("Category already exists.");
      return;
    }
    setCustomCategories((prevCategories) => [
      ...prevCategories,
      trimmedCategory,
    ]);
    setNewCategoryName("");
    toast.success(`Category "${trimmedCategory}" added!`);
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    if (predefinedCategories.includes(categoryToDelete)) {
      toast.error("Cannot delete predefined categories.");
      return;
    }
    setCustomCategories((prevCategories) =>
      prevCategories.filter((cat) => cat !== categoryToDelete)
    );
    // Also update todos that might be using this category
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.category === categoryToDelete
          ? { ...todo, category: undefined, updatedAt: Date.now() }
          : todo
      )
    );
    toast.success(`Category "${categoryToDelete}" deleted.`);
  };

  // Apply search, then filtering by category and status
  let currentTodos = todos.filter((todo) => {
    const matchesSearch = todo.text
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "All" || todo.category === filterCategory;
    const matchesStatus =
      filterStatus === "All" ||
      (filterStatus === "Active" && !todo.completed) ||
      (filterStatus === "Completed" && todo.completed);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Apply sorting by creating a new array
  let sortedTodos = [...currentTodos];
  if (sortOrder === "completed-last") {
    sortedTodos.sort((a, b) =>
      a.completed === b.completed ? 0 : a.completed ? 1 : -1
    );
  } else if (sortOrder === "alphabetical") {
    sortedTodos.sort((a, b) => a.text.localeCompare(b.text));
  } else if (sortOrder === "default") {
    // Sort by createdAt descending for default
    sortedTodos.sort((a, b) => b.createdAt - a.createdAt);
  }

  if (!hasMounted) {
    return (
      <div className="w-full max-w-md mx-auto p-4 border rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">My To-Do List</h2>
        <p className="text-center text-muted-foreground">Loading todos...</p>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto p-4 border rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">My To-Do List</h2>

      {/* Search Input */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search todos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Category Filter, Status Filter, and Sort Order */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 w-full sm:flex-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Category:
          </span>
          <Select
            onValueChange={setFilterCategory}
            defaultValue={filterCategory}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto z-50">
              <SelectItem value="All">All Categories</SelectItem>
              {allAvailableCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 w-full sm:flex-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Status:
          </span>
          <Select onValueChange={setFilterStatus} defaultValue={filterStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto z-50">
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 w-full sm:flex-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Sort by:
          </span>
          <Select onValueChange={setSortOrder} defaultValue={sortOrder}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select sort order" />
            </SelectTrigger>
            <SelectContent
              className="max-h-60 overflow-y-auto z-50"
              side="top"
              align="end"
            >
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="completed-last">Completed Last</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Add New Todo Section */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          type="text"
          placeholder="Add a new todo..."
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleAddTodo();
            }
          }}
          className="flex-grow"
        />
        <Select
          onValueChange={setSelectedCategoryForNewTodo}
          value={selectedCategoryForNewTodo}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Category (Optional)" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto z-50">
            <SelectItem value="none">No Category</SelectItem>
            {allAvailableCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full sm:w-[175px] justify-start text-left font-normal",
                !selectedDueDateForNewTodo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDueDateForNewTodo ? (
                format(selectedDueDateForNewTodo, "MM/dd/yyyy")
              ) : (
                <span>Due Date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDueDateForNewTodo}
              onSelect={setSelectedDueDateForNewTodo}
              initialFocus
            />
            {selectedDueDateForNewTodo && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedDueDateForNewTodo(undefined)}
                  className="w-full"
                >
                  Clear Due Date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        <Button onClick={handleAddTodo} className="w-full sm:w-auto">
          Add
        </Button>
      </div>

      {/* Manage Categories Section */}
      <div className="mb-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" /> Manage Categories
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Manage Categories</AlertDialogTitle>
              <AlertDialogDescription>
                Add new custom categories or delete existing ones. Predefined
                categories cannot be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddCategory();
                    }
                  }}
                />
                <Button onClick={handleAddCategory}>Add</Button>
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                {allAvailableCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No categories defined.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {allAvailableCategories.map((category) => (
                      <li
                        key={category}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{category}</span>
                        {!predefinedCategories.includes(category) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(category)}
                            className="text-destructive hover:text-destructive-foreground"
                          >
                            Delete
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Display Todos */}
      {sortedTodos.length === 0 &&
      todos.length > 0 &&
      (filterCategory !== "All" ||
        filterStatus !== "All" ||
        searchTerm !== "") ? (
        <p className="text-center text-muted-foreground">
          No todos matching the current filters/search.
        </p>
      ) : sortedTodos.length === 0 && todos.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No todos yet. Add one above!
        </p>
      ) : (
        <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
          {sortedTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggleTodo}
              onDelete={handleDeleteTodo}
              onEdit={handleEditTodo}
              onUpdateCategory={handleUpdateCategory}
              availableCategories={allAvailableCategories}
            />
          ))}
        </div>
      )}

      {/* Clear Completed Button */}
      {todos.length > 0 && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={handleClearCompleted}
            className="w-full"
          >
            Clear Completed Todos
          </Button>
        </div>
      )}
    </div>
  );
}
