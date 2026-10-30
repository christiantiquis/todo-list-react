type ShortcutEvent = Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "repeat" | "isComposing" | "defaultPrevented"> & { code?: string };
type ShortcutContext = { writable: boolean; editing?: boolean; dialogOpen?: boolean; taskFocused?: boolean };

export function keyboardShortcut(event: ShortcutEvent, context: ShortcutContext) {
  if (!context.writable || context.editing || context.dialogOpen || event.repeat || event.isComposing || event.defaultPrevented || event.shiftKey) return;
  if (event.altKey && !event.ctrlKey && !event.metaKey && (event.code === "KeyN" || event.key.toLowerCase() === "n")) return "add";
  if (event.altKey || !(event.ctrlKey || event.metaKey) || !context.taskFocused) return;
  if (event.key === "Enter") return "complete";
  if (event.key === "Backspace") return "delete";
}

export function shortcutContext(target: EventTarget | null) {
  return {
    editing: target instanceof Element && !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]'),
    dialogOpen: !!document.querySelector('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]'),
  };
}
