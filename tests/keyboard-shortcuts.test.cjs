const test = require('node:test');
const assert = require('node:assert/strict');
const { keyboardShortcut } = require('../src/lib/keyboard-shortcuts.ts');
const event = overrides => ({ key: '', altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, repeat: false, isComposing: false, defaultPrevented: false, ...overrides });
const focused = { writable: true, taskFocused: true };

test('add shortcut works without a focused task and requires Alt alone', () => {
  assert.equal(keyboardShortcut(event({ key: 'n', altKey: true }), { writable: true }), 'add');
  assert.equal(keyboardShortcut(event({ key: 'N', altKey: true }), { writable: true }), 'add');
  assert.equal(keyboardShortcut(event({ key: 'Dead', code: 'KeyN', altKey: true }), { writable: true }), 'add');
  assert.equal(keyboardShortcut(event({ key: 'n' }), focused), undefined);
  assert.equal(keyboardShortcut(event({ key: 'n', altKey: true, ctrlKey: true }), focused), undefined);
});

test('complete and delete require deliberate modifiers and task-row focus', () => {
  for (const modifier of ['ctrlKey', 'metaKey']) {
    for (const [key, action] of [['Enter', 'complete'], ['Backspace', 'delete']]) {
      const shortcut = event({ key, [modifier]: true });
      assert.equal(keyboardShortcut(shortcut, focused), action);
      assert.equal(keyboardShortcut(shortcut, { writable: true }), undefined);
      assert.equal(keyboardShortcut(event({ key }), focused), undefined);
      assert.equal(keyboardShortcut(event({ ...shortcut, altKey: true }), focused), undefined);
    }
  }
  assert.equal(keyboardShortcut(event({ key: 'Delete' }), focused), undefined);
});

test('shortcuts never act while typing, composing, repeating, in dialogs or while saving is disabled', () => {
  const shortcuts = [event({ key: 'n', altKey: true }), event({ key: 'Enter', ctrlKey: true }), event({ key: 'Backspace', metaKey: true })];
  for (const shortcut of shortcuts) {
    for (const context of [{ writable: false }, { editing: true }, { dialogOpen: true }]) {
      assert.equal(keyboardShortcut(shortcut, { ...focused, ...context }), undefined);
    }
    for (const key of ['repeat', 'isComposing', 'defaultPrevented', 'shiftKey']) {
      assert.equal(keyboardShortcut({ ...shortcut, [key]: true }, focused), undefined);
    }
  }
});
