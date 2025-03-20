"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Container,
  Fab,
  IconButton,
  OutlinedInput,
  Popover,
  Typography,
} from "@mui/material";
import TodoModal from "./todo-modal";
import TodoNavSideBar from "./todo-categories";
import { Item, ItemCategories } from "../interfaces/item.interface";
import EditIcon from "@mui/icons-material/Edit";
import ClearIcon from "@mui/icons-material/Clear";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AddIcon from "@mui/icons-material/Add";

import Tooltip from "@mui/material/Tooltip";

const CAButtonStyles = { padding: "2px", marginLeft: "2px !important" };

export default function TodoApp() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [itemCategories, setItemCategories] = useState<ItemCategories[] | null>(
    null
  );
  const [search, setSearch] = useState<string>("");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [todoActive, setTodoActive] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const handlePopoverOpen = (
    event: React.MouseEvent<HTMLElement>,
    itemId: number
  ) => {
    setAnchorEl(event.currentTarget);
    setTodoActive(itemId);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const handleAddTodo = (
    description: string,
    category: string[],
    dateAdded: string,
    itemId?: number
  ) => {
    if (!itemId) {
      const newItem: Item = {
        itemId: Date.now(),
        description,
        completed: false,
        categories: category,
        dateAdded: new Date(dateAdded),
      };
      setItems([...(items ?? []), newItem]);
    } else {
      setItems(
        (items) =>
          items?.map((item) =>
            item.itemId === itemId
              ? {
                  ...item,
                  description,
                  categories: category,
                  dateUpdated: new Date(dateAdded),
                }
              : item
          ) ?? []
      );
    }

    // Add the new category to the list if it doesn't already exist
    category.forEach((element) => {
      if (
        itemCategories &&
        !itemCategories.find((cat) => cat.name === element)
      ) {
        const newCat: ItemCategories = {
          categoryId: (itemCategories?.length ?? 0) + 1,
          name: element,
        };
        setItemCategories([...itemCategories, newCat]);
      }
    });
  };

  const handleAddButton = () => {
    setSelectedItem(null);
    setModalOpen(true);
  };

  const open = Boolean(anchorEl);

  const filteredItems = React.useMemo(() => {
    return items?.filter((todo) =>
      todo.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  useEffect(() => {
    const storedItems: Item[] = JSON.parse(
      localStorage.getItem("item-todos") || "[]"
    );
    const storedCategories: ItemCategories[] = JSON.parse(
      localStorage.getItem("item-categories") || "[]"
    );

    if (storedItems) {
      setItems(storedItems);
    } else {
      setItems([
        {
          itemId: 1,
          description: "Buy groceries",
          completed: false,
          categories: ["shopping", "exercise"],
          dateAdded: new Date(),
        },
        {
          itemId: 2,
          description: "Walk the dog",
          completed: true,
          categories: ["exercise", "leisure"],
          dateAdded: new Date(),
        },
        {
          itemId: 3,
          description: "Read a book",
          completed: true,
          categories: ["leisure"],
          dateAdded: new Date(),
        },
        {
          itemId: 4,
          description: "Write a blog post",
          completed: false,
          categories: ["work"],
          dateAdded: new Date(),
        },
        {
          itemId: 5,
          description: "Call mom",
          completed: false,
          categories: ["personal"],
          dateAdded: new Date(),
        },
        {
          itemId: 6,
          description: "Clean the house",
          completed: false,
          categories: ["chores"],
          dateAdded: new Date(),
        },
        {
          itemId: 7,
          description: "Prepare dinner",
          completed: false,
          categories: ["cooking"],
          dateAdded: new Date(),
        },
        {
          itemId: 8,
          description: "Pay bills",
          completed: false,
          categories: ["finance"],
          dateAdded: new Date(),
        },
        {
          itemId: 9,
          description: "Plan vacation",
          completed: false,
          categories: ["planning"],
          dateAdded: new Date(),
        },
        {
          itemId: 10,
          description: "Attend meeting",
          completed: false,
          categories: ["work"],
          dateAdded: new Date(),
        },
        {
          itemId: 11,
          description: "Go for a run",
          completed: false,
          categories: ["exercise"],
          dateAdded: new Date(),
        },
        {
          itemId: 12,
          description: "Organize closet",
          completed: false,
          categories: ["chores"],
          dateAdded: new Date(),
        },
        {
          itemId: 13,
          description: "Bake a cake",
          completed: false,
          categories: ["cooking"],
          dateAdded: new Date(),
        },
        {
          itemId: 14,
          description: "Meditate for 10 minutes",
          completed: false,
          categories: ["personal"],
          dateAdded: new Date(),
        },
        {
          itemId: 15,
          description: "Research investment options",
          completed: false,
          categories: ["finance"],
          dateAdded: new Date(),
        },
        {
          itemId: 16,
          description: "Fix the leaky faucet",
          completed: false,
          categories: ["chores"],
          dateAdded: new Date(),
        },
        {
          itemId: 17,
          description: "Watch a movie",
          completed: false,
          categories: ["leisure"],
          dateAdded: new Date(),
        },
        {
          itemId: 18,
          description: "Prepare a presentation",
          completed: false,
          categories: ["work"],
          dateAdded: new Date(),
        },
        {
          itemId: 19,
          description: "Plan weekly meals",
          completed: false,
          categories: ["planning", "cooking"],
          dateAdded: new Date(),
        },
        {
          itemId: 20,
          description: "Do yoga",
          completed: false,
          categories: ["exercise", "personal"],
          dateAdded: new Date(),
        },
        {
          itemId: 21,
          description: "Write a thank-you note",
          completed: false,
          categories: ["personal"],
          dateAdded: new Date(),
        },
        {
          itemId: 22,
          description: "Trim the garden",
          completed: false,
          categories: ["chores"],
          dateAdded: new Date(),
        },
        {
          itemId: 23,
          description: "Learn a new recipe",
          completed: false,
          categories: ["cooking"],
          dateAdded: new Date(),
        },
        {
          itemId: 24,
          description: "Set up a budget",
          completed: false,
          categories: ["finance", "planning"],
          dateAdded: new Date(),
        },
        {
          itemId: 25,
          description: "Attend a webinar",
          completed: false,
          categories: ["work"],
          dateAdded: new Date(),
        },
        {
          itemId: 26,
          description: "Play a board game",
          completed: false,
          categories: ["leisure"],
          dateAdded: new Date(),
        },
        {
          itemId: 27,
          description: "Sort old photos",
          completed: false,
          categories: ["personal"],
          dateAdded: new Date(),
        },
        {
          itemId: 28,
          description: "Repair the bike",
          completed: false,
          categories: ["chores"],
          dateAdded: new Date(),
        },
        {
          itemId: 29,
          description: "Try a new workout",
          completed: false,
          categories: ["exercise"],
          dateAdded: new Date(),
        },
        {
          itemId: 30,
          description: "Host a dinner party",
          completed: false,
          categories: ["cooking", "leisure"],
          dateAdded: new Date(),
        },
        {
          itemId: 31,
          description: "Review insurance policies",
          completed: false,
          categories: ["finance"],
          dateAdded: new Date(),
        },
        {
          itemId: 32,
          description: "Create a vision board",
          completed: false,
          categories: ["planning", "personal"],
          dateAdded: new Date(),
        },
        {
          itemId: 33,
          description: "Volunteer at a shelter",
          completed: false,
          categories: ["personal", "chores"],
          dateAdded: new Date(),
        },
        {
          itemId: 34,
          description: "Practice a musical instrument",
          completed: false,
          categories: ["leisure"],
          dateAdded: new Date(),
        },
        {
          itemId: 35,
          description: "Write a journal entry",
          completed: false,
          categories: ["personal"],
          dateAdded: new Date(),
        },
      ]);
    }

    if (storedCategories) {
      setItemCategories(storedCategories);
    } else {
      setItemCategories([
        { categoryId: 1, name: "Shopping" },
        { categoryId: 2, name: "Exercise" },
        { categoryId: 3, name: "Leisure" },
        { categoryId: 4, name: "Work" },
        { categoryId: 5, name: "Personal" },
        { categoryId: 6, name: "Chores" },
        { categoryId: 7, name: "Cooking" },
        { categoryId: 8, name: "Finance" },
        { categoryId: 9, name: "Planning" },
        { categoryId: 10, name: "Miscellaneous" },
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("item-todos", JSON.stringify(items));
    localStorage.setItem("item-categories", JSON.stringify(itemCategories));
  }, [items, itemCategories]);

  const deleteTodo = (index: number) => {
    if (!items) return;
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
  };

  const editTodo = (item: Item) => {
    if (!items) return;
    setSelectedItem(item);
    setModalOpen(true);
  };

  return (
    <>
      {typeof window !== "undefined" && (
        <Box
          className="text-white p-2"
          sx={{
            backgroundColor: "#99BC85",
            position: "absolute",
            height: "100vh",
            width: "100%",
            zIndex: -1,
            opacity: 0.5,
          }}
        ></Box>
      )}
      <Container
        disableGutters
        className="max-w-md mx-auto bg-white mt-20 h-3/4 flex flex-col"
        sx={{
          height: "100vh", // Explicitly set the height to 75% of the viewport
          display: "flex",
          flexDirection: "column",
          maxHeight: "800px",
        }}
      >
        <Box
          className="p-2"
          sx={{
            bgcolor: "#E4EFE7",
            height: "60px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Typography
            className="pl-5"
            variant="h4"
            component="h1"
            sx={{
              textAlign: "left",
              fontWeight: "bold",
              margin: "auto 0",
              lineHeight: "inherit",
            }}
          >
            TODO LIST
          </Typography>
          <Box
            sx={{
              display: "flex",
              right: 0,
              marginTop: 0,
            }}
          >
            <OutlinedInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              sx={{ height: "100%", mr: "20px" }}
              endAdornment={
                <ClearIcon
                  sx={{
                    cursor: "pointer",
                    visibility: search ? "visible" : "hidden",
                    zIndex: 1,
                  }}
                  onClick={() => setSearch("")}
                />
              }
            />
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            height: "100%",
            maxHeight: "740px",
            position: "relative",
          }}
        >
          {/* Sidebar */}
          <Box
            sx={{
              display: "flex",
              flex: "0 0 250px",
              height: "100%",
              bgcolor: "#FDFAF6",
              p: 2,
              maxHeight: "740px",
              overflow: "auto",
            }}
          >
            <TodoNavSideBar itemCategories={itemCategories || []} />
          </Box>
          <Box
            sx={{
              flex: "1",
              position: "relative",
              maxHeight: "740px",
              overflow: "auto",
              height: "100%",
            }}
          >
            <Box
              sx={{
                p: 1,
                m: 1,
                borderRadius: 1,
                overflow: "auto",
              }}
            >
              {filteredItems &&
                filteredItems.map((todo, index) => (
                  <Card
                    className="flex flex-row p-1 m-1 rounded-xs"
                    key={todo.itemId}
                    variant="outlined"
                    sx={{
                      bgcolor: "#FAF1E6",
                      border: 1,
                      borderColor: "text.secondary",
                      width: "50%",
                    }}
                  >
                    <Box>
                      <Checkbox
                        defaultChecked={todo.completed}
                        sx={{
                          padding: "0",
                          color: "#99BC85",
                          "&.Mui-checked": { color: "#99BC85" },
                        }}
                      />
                    </Box>
                    <CardContent
                      className="flex items-center"
                      sx={{
                        p: 0,
                        "&:last-child": { pb: 0 },
                      }}
                    >
                      <Typography
                        className="pl-1"
                        sx={{ color: "text.secondary", fontSize: 14 }}
                      >
                        {todo.description}
                      </Typography>
                    </CardContent>
                    <Box className="flex-grow"></Box>
                    <CardActions
                      className="flex justify-self-end"
                      sx={{ p: 0, "&:last-child": { pb: 0 } }}
                    >
                      <IconButton
                        sx={CAButtonStyles}
                        onMouseEnter={(event) =>
                          handlePopoverOpen(event, todo.itemId)
                        }
                        onMouseLeave={handlePopoverClose}
                      >
                        <InfoOutlinedIcon
                          fontSize="small"
                          sx={{ color: "#99BC85" }}
                        />
                      </IconButton>
                      <Popover
                        id="mouse-over-popover"
                        sx={{ pointerEvents: "none" }}
                        open={open && todoActive == todo.itemId}
                        anchorEl={anchorEl}
                        anchorOrigin={{
                          vertical: "top",
                          horizontal: "right",
                        }}
                        transformOrigin={{
                          vertical: "top",
                          horizontal: "left",
                        }}
                        onClose={handlePopoverClose}
                        disableRestoreFocus
                      >
                        <Typography sx={{ p: 1 }}>
                          <strong>
                            {todo.categories.length > 1
                              ? "Categories: "
                              : "Category: "}
                          </strong>
                          {todo.categories.join(", ")}
                        </Typography>
                        <Typography sx={{ p: 1 }}>
                          <strong>Date Added: &nbsp;</strong>
                          {todo.dateAdded?.toLocaleString() ?? null}
                        </Typography>
                        <Typography sx={{ p: 1 }}>
                          <strong>Due Date: &nbsp;</strong>
                          {todo.dateDue?.toLocaleString() ?? null}
                        </Typography>
                      </Popover>
                      <Tooltip title="Edit">
                        <IconButton
                          sx={CAButtonStyles}
                          onClick={() => editTodo(todo)}
                        >
                          <EditIcon
                            fontSize="small"
                            sx={{ color: "#99BC85" }}
                          />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          sx={CAButtonStyles}
                          onClick={() => deleteTodo(index)}
                        >
                          <ClearIcon
                            fontSize="small"
                            sx={{ color: "#99BC85" }}
                          />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                ))}
            </Box>
          </Box>
          <Box
            sx={{
              "& > :not(style)": { mb: 2, mr: 3 },
              position: "absolute",
              bottom: 0,
              right: 0,
            }}
          >
            <Fab color="primary" aria-label="add">
              <AddIcon
                onClick={() => {
                  handleAddButton();
                }}
              />
            </Fab>
          </Box>
        </Box>
      </Container>
      <TodoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAddTodo={handleAddTodo}
        categories={itemCategories ?? []}
        item={selectedItem ?? undefined}
      />
    </>
  );
}
