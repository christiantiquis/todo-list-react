"use client";
import {
  Box,
  Modal,
  Typography,
  TextField,
  Button,
  Chip,
  Autocomplete,
} from "@mui/material";
import { Item, ItemCategories } from "../interfaces/item.interface";
import { useEffect, useState } from "react";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

interface TodoModalProps {
  open: boolean;
  onClose: () => void;
  onAddTodo: (
    description: string,
    category: string[],
    dateAdded: string,
    itemId?: number
  ) => void;
  categories: ItemCategories[];
  item?: Item;
}

export default function TodoModal({
  open,
  onClose,
  onAddTodo,
  categories,
  item,
}: TodoModalProps) {
  const [newTodo, setNewTodo] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string[] | null>(
    null
  );

  const handleAddTodo = () => {
    if (newTodo.trim() === "") return; // Prevent adding empty todos

    const dateAdded = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

    onAddTodo(newTodo, selectedCategory ?? [], dateAdded, item?.itemId); // Call the parent function to add the todo
    setNewTodo(""); // Clear the input field
    setSelectedCategory(null); // Clear the selected category
    onClose(); // Close the modal
  };

  useEffect(() => {
    if (!item) {
      setNewTodo("");
      setSelectedCategory([]);
      return;
    }
    setNewTodo(item.description);
    const updatedCategories: string[] = [];
    item.categories.forEach((element) => {
      const foundCategory = categories.find(
        (cat) => cat.name.toLowerCase() === element
      );
      if (foundCategory) {
        updatedCategories.push(foundCategory.name);
      }
    });
    setSelectedCategory(updatedCategories);
  }, [item, categories]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <Typography id="modal-modal-title" variant="h6" component="h2">
          Add New Todo
        </Typography>
        <TextField
          fullWidth
          label="Todo Description"
          variant="outlined"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          sx={{ mt: 2 }}
        />
        <Autocomplete
          sx={{ marginTop: "16px" }}
          multiple
          id="tags-filled"
          options={categories.map((option) => option.name)}
          defaultValue={[]}
          value={selectedCategory ?? []}
          onChange={(event, value) => setSelectedCategory(value)}
          freeSolo
          renderTags={(value: readonly string[], getTagProps) =>
            value.map((option: string, index: number) => {
              const { key, ...tagProps } = getTagProps({ index });
              return (
                <Chip
                  variant="outlined"
                  label={option}
                  key={key}
                  {...tagProps}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Categories"
              placeholder="Select or Add new Category"
            />
          )}
        />
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button variant="contained" color="primary" onClick={handleAddTodo}>
            Submit
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
