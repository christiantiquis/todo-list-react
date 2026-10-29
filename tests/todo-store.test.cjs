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
  const result = editTodo([task({ category: 'Work', dueDate: 123, agent: 'cursor' }), other], 'one', '  Updated  ');
  assert.equal(result[0].text, 'Updated');
  assert.equal(result[0].category, undefined);
  assert.equal(result[0].dueDate, undefined);
  assert.equal(result[0].agent, 'cursor');
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
const {
  DATA_KEY, TRASH_RETENTION_MS, MAX_BACKUP_BYTES, emptyTodoData, trashTodos,
  restoreTrash, pruneTrash, createBackup, parseBackup, mergeBackup,
  commitTodoChange, assertTaskUnchanged, TodoConflictError,
} = require('../src/lib/todo-store.ts');
const now = new Date(2026, 9, 27, 12).getTime();
const dataWith = (todos = []) => ({ ...emptyTodoData(), todos });
function queuedLocks() {
  let tail = Promise.resolve();
  return { request(_name, callback) {
    const result = tail.then(callback);
    tail = result.catch(() => {});
    return result;
  } };
}
test('existing snapshot without Trash or revisions migrates without changing tasks', () => {
  const saved = storage({ [DATA_KEY]: JSON.stringify({ todos: [task()], customCategories: ['Projects'] }) });
  const loaded = loadTodoData(saved);
  assert.equal(loaded.revision, 0);
  assert.deepEqual(loaded.data.trash, []);
  assert.deepEqual(loaded.data.todos, [task()]);
});
test('deleting tasks moves them to Trash once and retains their details', () => {
  const original = task({ category: 'Work', dueDate: now, completed: true, completedAt: now });
  const removed = trashTodos(dataWith([original, task({ id: 'two' })]), ['one'], now);
  assert.deepEqual(removed.todos.map(t => t.id), ['two']);
  assert.deepEqual(removed.trash, [{ todo: original, deletedAt: now }]);
  assert.equal(trashTodos(removed, ['one'], now).trash.length, 1);
});
test('Trash survives save/reload and restores all task fields', () => {
  const saved = storage();
  const original = task({ category: 'Work', dueDate: now, completed: true, completedAt: now });
  saveTodoData(saved, trashTodos(dataWith([original]), ['one'], now));
  const restored = restoreTrash(loadTodoData(saved).data, ['one'], now + 1);
  assert.deepEqual(restored.todos, [original]);
  assert.deepEqual(restored.trash, []);
  assert.equal(restoreTrash(restored, ['one'], now + 1).todos.length, 1);
});
test('Trash expires at exactly 30 days; expired entries cannot be restored', () => {
  const data = trashTodos(dataWith([task()]), ['one'], now);
  assert.equal(pruneTrash(data, now + TRASH_RETENTION_MS - 1).trash.length, 1);
  assert.equal(pruneTrash(data, now + TRASH_RETENTION_MS).trash.length, 0);
  assert.equal(restoreTrash(data, ['one'], now + TRASH_RETENTION_MS).todos.length, 0);
});
test('restoring a task whose list was removed leaves it unassigned', () => {
  const data = trashTodos({ ...dataWith([task({ category: 'Project' })]), customCategories: ['Project'] }, ['one'], now);
  const deleted = deleteCategory(data, 'Project');
  assert.equal(deleted.trash.length, 1);
  assert.equal(restoreTrash(deleted, ['one'], now).todos[0].category, undefined);
});
test('backup round-trip includes active, completed, custom lists, and Trash', () => {
  const data = trashTodos({ ...dataWith([task(), task({ id: 'done', completed: true }), task({ id: 'deleted' })]), customCategories: ['All'] }, ['deleted'], now);
  const backup = createBackup(data, now);
  assert.deepEqual(parseBackup(backup, now), data);
  assert.equal(JSON.parse(backup).version, 1);
});
test('malformed, unsupported, duplicate, and oversized backups are rejected', () => {
  assert.throws(() => parseBackup('invalid', now), /JSON/);
  const good = JSON.parse(createBackup(dataWith([task()]), now));
  for (const invalid of [
    { ...good, version: 2 },
    { ...good, format: 'other-app' },
    { ...good, data: { ...good.data, todos: [task({ completed: 'yes' })] } },
    { ...good, data: { ...good.data, todos: [task(), task()] } },
    { ...good, data: { ...good.data, trash: [{ todo: task(), deletedAt: now }] } },
  ]) assert.throws(() => parseBackup(JSON.stringify(invalid), now), /supported/);
  assert.throws(() => parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1), now), /5 MB/);
});
test('backup export/import excludes expired Trash', () => {
  const data = trashTodos(dataWith([task()]), ['one'], now);
  const backup = createBackup(data, now);
  assert.equal(parseBackup(backup, now + TRASH_RETENTION_MS).trash.length, 0);
  assert.equal(JSON.parse(createBackup(data, now + TRASH_RETENTION_MS)).data.trash.length, 0);
});
test('import never overwrites active or deleted IDs and is repeatable', () => {
  const current = trashTodos(dataWith([task({ text: 'Keep current' }), task({ id: 'deleted' })]), ['deleted'], now);
  const incoming = { ...dataWith([task({ text: 'Old content' }), task({ id: 'deleted' }), task({ id: 'new', category: 'Project' })]), customCategories: ['Project'] };
  const merged = mergeBackup(current, incoming, now);
  assert.equal(merged.todos.find(t => t.id === 'one').text, 'Keep current');
  assert.equal(merged.todos.some(t => t.id === 'deleted'), false);
  assert.equal(merged.trash.length, 1);
  assert.ok(merged.customCategories.includes('Project'));
  assert.deepEqual(mergeBackup(merged, incoming, now), merged);
});
test('concurrent tab changes are serialized and preserve distinct additions', async () => {
  const saved = storage();
  const locks = queuedLocks();
  await Promise.all(Array.from({ length: 30 }, (_, index) => commitTodoChange(saved, locks,
    current => ({ ...current, todos: [...current.todos, task({ id: String(index) })] }), now)));
  const result = loadTodoData(saved);
  assert.equal(result.data.todos.length, 30);
  assert.equal(result.revision, 30);
});
test('unrelated edits merge, while a stale edit to the same task is rejected', async () => {
  const saved = storage();
  saveTodoData(saved, dataWith([task(), task({ id: 'two' })]));
  const locks = queuedLocks();
  const baseline = task();
  await commitTodoChange(saved, locks, current => ({ ...current, todos: editTodo(current.todos, 'two', 'Other change') }), now);
  await commitTodoChange(saved, locks, current => {
    assertTaskUnchanged(current, baseline);
    return { ...current, todos: editTodo(current.todos, 'one', 'First edit') };
  }, now);
  await assert.rejects(() => commitTodoChange(saved, locks, current => {
    assertTaskUnchanged(current, baseline);
    return { ...current, todos: editTodo(current.todos, 'one', 'Stale edit') };
  }, now), TodoConflictError);
  assert.deepEqual(loadTodoData(saved).data.todos.map(t => t.text), ['First edit', 'Other change']);
});
test('saving fails safely without tab locks or when storage is full', async () => {
  const saved = storage();
  await assert.rejects(() => commitTodoChange(saved, undefined, current => current, now), /coordination/);
  assert.equal(saved.values.size, 0);
  saveTodoData(saved, dataWith([task()]));
  const original = saved.getItem(DATA_KEY);
  saved.setItem = () => { throw new Error('Quota exceeded'); };
  await assert.rejects(() => commitTodoChange(saved, queuedLocks(), current => trashTodos(current, ['one'], now), now), /Quota/);
  assert.equal(saved.getItem(DATA_KEY), original);
});
test('revision guards prevent recreating cleared or rolled-back data', async () => {
  const saved = storage();
  saveTodoData(saved, dataWith([task()]), 3);
  await assert.rejects(() => commitTodoChange(saved, queuedLocks(), current => current, now, { minimumRevision: 4 }), TodoConflictError);
  saved.values.delete(DATA_KEY);
  await assert.rejects(() => commitTodoChange(saved, queuedLocks(), current => current, now, { requireExisting: true }), TodoConflictError);
  assert.equal(saved.getItem(DATA_KEY), null);
});
test('compare-before-save rejects a writer that changes the snapshot without the lock', () => {
  const saved = storage();
  saveTodoData(saved, dataWith([task()]));
  const loaded = loadTodoData(saved);
  saveTodoData(saved, dataWith([task({ text: 'Newer' })]), 1);
  assert.throws(() => saveTodoData(saved, loaded.data, 1, loaded.raw), TodoConflictError);
  assert.equal(loadTodoData(saved).data.todos[0].text, 'Newer');
});
const {
  addAgentTask, claimAgentTask, completeAgentTask, releaseAgentTask, deleteAgentTask, findAgentTask, selectAgentTasks, agentDueDate, AgentTaskError,
} = require('../src/lib/todo-store.ts');
test('agent tasks keep their owner through save, reload, and backup', () => {
  const saved = storage();
  const created = addAgentTask(emptyTodoData(), { text: '  Ship export  ', list: 'billing-app', agent: ' cursor ' }, now, 'task-1');
  assert.equal(created.task.text, 'Ship export');
  assert.equal(created.task.agent, 'cursor');
  assert.equal(created.task.category, 'billing-app');
  assert.deepEqual(created.data.customCategories, ['billing-app']);
  saveTodoData(saved, created.data);
  assert.equal(loadTodoData(saved).data.todos[0].agent, 'cursor');
  assert.equal(parseBackup(createBackup(created.data, now), now).todos[0].agent, 'cursor');
});
test('a new project list is created once and a known list is reused', () => {
  const first = addAgentTask(emptyTodoData(), { text: 'One', list: 'work' }, now, 'a');
  assert.equal(first.task.category, 'Work');
  assert.deepEqual(first.data.customCategories, []);
  const second = addAgentTask(first.data, { text: 'Two', list: 'Billing-App' }, now, 'b');
  const third = addAgentTask(second.data, { text: 'Three', list: 'billing-app' }, now, 'c');
  assert.deepEqual(third.data.customCategories, ['Billing-App']);
  assert.equal(third.task.category, 'Billing-App');
});
test('claim stays exclusive while any agent can complete or release', () => {
  const created = addAgentTask(emptyTodoData(), { text: 'Open' }, now, 'task-1');
  const claimed = claimAgentTask(created.data, 'task-1', 'cursor', now + 1);
  assert.equal(claimed.task.agent, 'cursor');
  assert.equal(claimAgentTask(claimed.data, 'task-1', 'cursor', now + 2).task.agent, 'cursor');
  assert.throws(() => claimAgentTask(claimed.data, 'task-1', 'codex'), (error) => error instanceof AgentTaskError && error.status === 409 && /cursor/.test(error.message));
  const done = completeAgentTask(created.data, 'task-1', 'codex', now + 3);
  assert.equal(done.task.completed, true);
  assert.equal(done.task.agent, 'codex');
  assert.equal(done.task.finishedBy, 'codex');
  assert.equal(done.task.completedAt, now + 3);
  assert.throws(() => completeAgentTask(done.data, 'task-1', 'codex'), (error) => error.status === 409);
  const finished = completeAgentTask(claimed.data, 'task-1', 'codex', now + 5);
  assert.equal(finished.task.agent, 'cursor');
  assert.equal(finished.task.finishedBy, 'codex');
  assert.equal(finished.task.completed, true);
  const released = releaseAgentTask(claimed.data, 'task-1', 'codex', now + 4);
  assert.equal(released.task.agent, undefined);
  assert.throws(() => releaseAgentTask(released.data, 'task-1', 'cursor'), (error) => error.status === 409 && /not claimed/.test(error.message));
  assert.throws(() => claimAgentTask(created.data, 'missing', 'cursor'), (error) => error.status === 404);
  assert.throws(() => addAgentTask(emptyTodoData(), { text: '   ' }), (error) => error.status === 400);
  assert.throws(() => addAgentTask(emptyTodoData(), { text: 'Ok', agent: 'x'.repeat(65) }), (error) => error.status === 400);
  assert.equal(agentDueDate('2026-10-29'), Date.parse('2026-10-29T00:00:00.000Z'));
  assert.equal(agentDueDate(undefined), undefined);
  assert.throws(() => agentDueDate('tomorrow'), (error) => error.status === 400);
});
test('delete moves an owned task to trash and keeps it out of the active list', () => {
  const created = addAgentTask(emptyTodoData(), { text: 'Open', agent: 'cursor' }, now, 'task-1');
  const removed = deleteAgentTask(created.data, 'task-1', 'cursor', now + 1);
  assert.equal(removed.data.todos.length, 0);
  assert.deepEqual(removed.data.trash, [{ todo: { ...created.task, agent: 'cursor', finishedBy: 'cursor', updatedAt: now + 1 }, deletedAt: now + 1 }]);
  assert.equal(findAgentTask(removed.data, 'task-1').text, 'Open');
  assert.equal(selectAgentTasks(removed.data.todos, 'all').length, 0);
  const removedByOther = deleteAgentTask(created.data, 'task-1', 'codex', now + 6);
  assert.equal(removedByOther.task.agent, 'cursor');
  assert.equal(removedByOther.task.finishedBy, 'codex');
  assert.equal(removedByOther.data.todos.length, 0);
  const unowned = addAgentTask(emptyTodoData(), { text: 'Loose' }, now, 'task-2');
  const taken = deleteAgentTask(unowned.data, 'task-2', 'cursor', now + 2);
  assert.equal(taken.task.agent, 'cursor');
  assert.equal(taken.task.finishedBy, 'cursor');
  assert.equal(taken.data.trash[0].deletedAt, now + 2);
  const done = completeAgentTask(created.data, 'task-1', 'cursor', now + 3);
  const deletedDone = deleteAgentTask(done.data, 'task-1', 'codex', now + 4);
  assert.equal(deletedDone.task.completed, true);
  assert.equal(deletedDone.task.finishedBy, 'cursor');
  assert.throws(() => deleteAgentTask(emptyTodoData(), 'missing', 'cursor'), (error) => error.status === 404);
});
test('agent task queries can select open, done, and one owner', () => {
  const open = task({ agent: 'cursor' });
  const done = task({ id: 'two', completed: true, agent: 'codex' });
  const other = task({ id: 'three', agent: 'cursor' });
  assert.deepEqual(selectAgentTasks([open, done, other], 'open', 'cursor').map(todo => todo.id), ['one', 'three']);
  assert.deepEqual(selectAgentTasks([open, done, other], 'done').map(todo => todo.id), ['two']);
  assert.equal(selectAgentTasks([open, done, other], 'all').length, 3);
});
