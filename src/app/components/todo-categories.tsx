import {
  Collapse,
  Container,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { ItemCategories } from "../interfaces/item.interface";
import { useState } from "react";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

export default function TodoNavSideBar(props: {
  itemCategories: ItemCategories[];
  onCategorySelect: (category: string | null) => void; // Add callback prop
}) {
  const [open, setOpen] = useState(true);

  const handleClick = () => {
    setOpen(!open);
  };

  return (
    <Container sx={{ padding: "0 !important" }}>
      <List
        sx={{
          padding: "0",
        }}
      >
        <ListItem disablePadding>
          <ListItemButton onClick={() => props.onCategorySelect(null)}>
            <ListItemText primary="Home" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleClick}>
            <ListItemText primary="Categories" />
            {open ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={open} timeout="auto" unmountOnExit>
          {props.itemCategories &&
            props.itemCategories.map((category) => (
              <List
                component="div"
                disablePadding
                key={category?.categoryId || category?.name}
              >
                <ListItemButton
                  sx={{ pl: 4 }}
                  onClick={() => props.onCategorySelect(category.name)}
                >
                  <ListItemText primary={category?.name} />
                </ListItemButton>
              </List>
            ))}
        </Collapse>
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemText primary="Notes" />
          </ListItemButton>
        </ListItem>
      </List>
    </Container>
  );
}
