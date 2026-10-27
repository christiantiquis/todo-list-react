const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTodoData, saveTodoData, editTodo, deleteCategory, categoryValue, decodeCategory, selectTodos, deadline, restoreTodos } = require('../src/lib/todo-store.ts');
const task = (patch = {}) => ({ id: 'one', text: 'Buy milk', completed: false, createdAt: 1, ...patch });
function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
test('migrates legacy data, retains task categories, and saves one validated snapshot', () => {
  const saved = storage({ 'todo-list': JSON.stringify([task({ category: 'none' })]), 'todo-categories': '["All"]' });
  const { data } = loadTodoData(saved);
  assert.deepEqual(data.customCategories, ['All', 'none']);
  saveTodoData(saved, data);
  assert.deepEqual(loadTodoData(saved).data, data);
  assert.ok(saved.values.has('todo-list'));
});
test('preserves malformed originals before allowing replacement', () => {
  for (const raw of ['{broken', '{}', JSON.stringify([task({ text: 42 })]), JSON.stringify([task(), task()])]) {
    const saved = storage({ 'todo-list': raw });
    const result = loadTodoData(saved);
    assert.equal(result.warnings.length, 1);
    assert.ok([...saved.values].some(([key, value]) => key.startsWith('todo-list.recovery.') && value === raw));
    saveTodoData(saved, result.data);
    assert.equal(saved.getItem('todo-list'), raw);
  }
});
test('failed recovery copy aborts loading and leaves original untouched', () => {
  const saved = storage({ 'todo-data-v1': 'broken' });
  saved.setItem = () => { throw new Error('Full'); };
  assert.throws(() => loadTodoData(saved), /Full/);
  assert.equal(saved.getItem('todo-data-v1'), 'broken');
});
test('read and save failures are surfaced; invalid changes are never persisted', () => {
  assert.throws(() => loadTodoData({ getItem() { throw new Error('Denied'); } }), /Denied/);
  const saved = storage();
  assert.throws(() => saveTodoData(saved, { todos: [task({ dueDate: Infinity })], customCategories: [] }));
  assert.equal(saved.values.size, 0);
  assert.throws(() => saveTodoData({ setItem() { throw new Error('Full'); } }, { todos: [], customCategories: [] }), /Full/);
});
test('editing trims text, clears optional fields, and leaves other tasks untouched', () => {
  const other = task({ id: 'two' });
  const result = editTodo([task({ category: 'Work', dueDate: 123 }), other], 'one', '  Updated  ');
  assert.equal(result[0].text, 'Updated');
  assert.equal(result[0].category, undefined);
  assert.equal(result[0].dueDate, undefined);
  assert.equal(result[1], other);
  assert.throws(() => editTodo(result, 'one', '  '), /empty/);
});
test('category deletion removes assignments but protects built-in categories', () => {
  const data = { todos: [task({ category: 'All' }), task({ id: 'two', category: 'Work' })], customCategories: ['All'] };
  const result = deleteCategory(data, 'All');
  assert.deepEqual(result.customCategories, []);
  assert.equal(result.todos[0].category, undefined);
  assert.equal(result.todos[1].category, 'Work');
  assert.equal(deleteCategory(data, 'Work'), data);
});
test('special-looking category names remain independently selectable', () => {
  for (const name of ['All', 'all', 'none', 'category:Work']) {
    assert.equal(decodeCategory(categoryValue(name)), name);
    const tasks = [task({ category: name }), task({ id: 'two' })];
    assert.equal(selectTodos(tasks, '', categoryValue(name), 'All', 'all', 'default', new Date()).length, 1);
  }
});
test('deadline filters use local calendar days and exclude completed tasks', () => {
  const now = new Date(2026, 9, 27, 12);
  const yesterday = task({ dueDate: new Date(2026, 9, 26).getTime() });
  const today = task({ id: 'two', dueDate: new Date(2026, 9, 27, 23, 59).getTime() });
  const future = task({ id: 'three', dueDate: new Date(2026, 9, 28).getTime() });
  assert.equal(deadline(yesterday, now), 'overdue');
  assert.equal(deadline(today, now), 'today');
  assert.equal(deadline(future, now), 'upcoming');
  assert.equal(deadline({ ...yesterday, completed: true }, now), 'none');
  assert.deepEqual(selectTodos([future, today, yesterday], '', 'all', 'All', 'today', 'due-date', now), [today]);
  assert.deepEqual(selectTodos([task({ id: 'four' }), future, today, yesterday], '', 'all', 'All', 'all', 'due-date', now).map(t => t.id), ['one', 'two', 'three', 'four']);
});
test('undo preserves intervening tasks without duplicates or deleted categories', () => {
  const current = [task({ id: 'new' })];
  const removed = [task({ category: 'Deleted' })];
  const restored = restoreTodos(current, removed, ['Work']);
  assert.equal(restored.length, 2);
  assert.equal(restored[1].category, undefined);
  assert.equal(restoreTodos(restored, removed, ['Work']).length, 2);
});
const { workspaceTodos } = require('../src/lib/todo-store.ts');
test('workspace views separate daily, upcoming, completed, and list tasks', () => {
  const now = new Date(2026, 9, 27, 12);
  const tasks = [
    task({ id: 'old', dueDate: new Date(2026, 9, 26).getTime(), category: 'Work' }),
    task({ id: 'today', dueDate: new Date(2026, 9, 27).getTime() }),
    task({ id: 'future', dueDate: new Date(2026, 9, 28).getTime() }),
    task({ id: 'done', completed: true, dueDate: new Date(2026, 9, 27).getTime(), category: 'Work' }),
    task({ id: 'undated' }),
  ];
  const ids = view => workspaceTodos(tasks, view, '', 'due-date', now).map(todo => todo.id);
  assert.deepEqual(ids('day'), ['old', 'today']);
  assert.deepEqual(ids('upcoming'), ['future']);
  assert.deepEqual(ids('completed'), ['done']);
  assert.deepEqual(ids(categoryValue('Work')), ['old', 'done']);
  assert.equal(ids('all').length, 5);
  assert.equal(workspaceTodos(tasks, 'day', 'missing', 'default', now).length, 0);
});
