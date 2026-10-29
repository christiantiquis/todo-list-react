<p align="center">
  <img src="public/todolizt-logo.png" alt="TodoLizt checklist logo" width="72" height="72" />
</p>

<h1 align="center">TodoLizt</h1>
<p align="center">Your tasks, a little clearer.</p>

TodoLizt is a personal task manager built with Next.js, React, and TypeScript.
Plan your day, organize tasks into lists, and track deadlines in a responsive
workspace with light and dark themes. Tasks are saved in your browser, with
exportable backups, a 30-day Trash, and protection against conflicting tab edits.

[Deployment workflow](https://github.com/christiantiquis/todo-list-react/actions/workflows/nextjs.yml)
· [Report an issue](https://github.com/christiantiquis/todo-list-react/issues)

## Features

- **Daily focus:** My Day brings together tasks due today and overdue tasks.
- **Task management:** Add, edit, complete, and delete tasks with optional lists, due dates, and priorities.
- **Organized views:** Switch between All Tasks, Upcoming, Completed, Trash, and your lists.
- **Search and sorting:** Search within the current view; sort by deadline, priority, newest first, or alphabetically.
- **Custom lists:** Create your own lists alongside Work, Personal, and Shopping.
- **Recoverable deletion:** Restore individual tasks or matching groups from Trash for 30 days, with a quick Undo after deletion.
- **Portable backups:** Export JSON backups and preview validated imports before merging them.
- **Safer multi-tab use:** Tabs refresh when saved data changes; stale edits cannot silently overwrite a newer task.
- **Responsive appearance:** Mobile navigation, keyboard-accessible controls, and light, dark, or system themes.

## How to use it

1. Open **My Day** and type a task into the task composer. Press Enter or select **Add**.
2. Expand **List, date & priority** to choose a list, change the deadline, or mark a task high, medium, or low.
3. Check a task to complete it, or use its edit and details buttons.
4. Select the **+** beside **Your lists** to create or manage custom lists.
5. Open **Data & backup** near the bottom of the sidebar to download or import a backup.

New tasks inherit today's date in My Day, tomorrow's date in Upcoming, and the
selected list when you are browsing a list. My Day excludes undated tasks;
**All Tasks** is where you can find everything. Upcoming shows active tasks due
after today. Deadlines use your browser's local calendar, and undated tasks sort
last when sorting by due date. Sorting by priority puts high first and leaves tasks with no priority last. Search applies only to the current view.

## Where your tasks are saved

Without an account, TodoLizt uses **local storage in your browser**. Task data is
not uploaded.

- Tasks survive page refreshes and application restarts on the same browser profile and origin.
- Another device, browser profile, or website origin has a separate task collection.
- People sharing a browser profile and origin share the same stored tasks.
- Clearing site data removes tasks, Trash, and local recovery copies. Downloaded backups remain separate.
- Signing in replaces the browser list with that account's tasks. Edits while signed in are saved to the account. Logging out leaves that replaced copy in the browser; the next sign-in replaces it from the account again.
- There is no public signup, cloud sync between guest browsers, background reminder service, or installable offline app.

Download backups periodically if you rely on TodoLizt for everyday tasks. A copy
in browser storage alone is not a backup against clearing that browser's data.

### Backups and recovery

Open **Data & backup → Export backup** to download a JSON file containing tasks,
custom lists, and unexpired Trash. To import, choose a TodoLizt backup, review the
preview, and select **Merge backup**.

Imports add missing task IDs and lists. Existing tasks, including those in Trash,
stay unchanged. Repeating the same import does not duplicate those tasks. Invalid
files, unsupported backup versions, and files larger than 5 MB are rejected.
Expired Trash is skipped. Backup files are readable JSON, so keep them somewhere
private.

Deleted tasks remain in **Trash** for 30 days. Restore retains task details;
if the original list has been removed, the task returns without a list. Expired
items are removed from saved storage when the app is open or writes changes.
There is no permanent-delete button.

### Storage safeguards

Stored data is validated before use. Invalid content is copied to a recovery key
before replacement. If reading it or creating the copy fails, saving pauses and
the app displays a warning. Recovery copies can be inspected through your browser's
developer tools under **Application → Local Storage**.

Updated tabs on the same origin coordinate writes through Web Locks and re-read
the latest saved snapshot for each change. Unrelated changes are preserved. If
another tab edits the same task, a stale edit is rejected and its draft stays
visible. Cancel editing to load the latest task before trying again. Reload all
open tabs after an app upgrade so they use the same storage protocol.

Saving requires a current browser with Web Locks, served over **HTTPS or
localhost**. Where coordination is unavailable, viewing and exporting remain
available, while saving is paused.

<details>
<summary>Storage format and compatibility</summary>

The current snapshot is stored under `todo-data-v1`, with tasks, custom categories,
Trash, and a revision number. Older `todo-list` and `todo-categories` entries are
read when no current snapshot exists; original entries are retained.

Invalid content is preserved under `<original-key>.recovery.<unique-id>` before it
can be replaced. Legacy entries and recovery copies are separate from Trash, so
Trash expiry is not a secure erase of historical copies.

The internal backup format identifier remains `daylight-backup` for compatibility
with files created before the app was renamed to TodoLizt. Download filenames use
`todolizt-backup-YYYY-MM-DD.json`.

</details>

## Run locally

Use **Node.js 22.18 or newer** and npm to run the app and its TypeScript tests.
No environment variables, database credentials, or API keys are needed.

```sh
git clone https://github.com/christiantiquis/todo-list-react.git
cd todo-list-react
npm ci --legacy-peer-deps
npm run dev
```

Open [localhost:3000](http://localhost:3000). Saved code changes update the
running development page automatically; refresh if necessary. Dependency or
configuration changes may require restarting the development server.

For a local production build:

```sh
npm run build
npm start
```

Production changes require a fresh build and server restart. System fonts are
used, so the build does not need to download Google Fonts.

## Development checks

```sh
npm test
npm run typecheck
npm run build
```

The test suite covers saved-data validation, legacy migration, recovery-copy
failures, task edits, list deletion, deadline boundaries, workspace views, backup
validation and merging, Trash expiry and restore, concurrent writes, and stale
edit protection.

`npm run lint` is listed in the package scripts, but the current repository is
missing the ESLint dependencies needed to run it. Do not treat a successful
production build as a completed lint check.

## Homelab deployment

The [deploy workflow](.github/workflows/nextjs.yml) runs on the self-hosted runner
on homelab1. It starts automatically on pushes to **main**, and it can also be
started manually from the repository's **Actions** tab.

The job builds the Next.js server and serves it from Docker. The container
publishes host port **7200**. On homelab1 the site is `http://127.0.0.1:7200/`.
Sign-in uses the repository Actions secrets `DATABASE_URL` and `AUTH_SECRET`.
The deploy passes them into the container. [deploy/env.example](deploy/env.example)
shows the shape of `DATABASE_URL`. Create an account
only from the server, with no signup page:

```sh
docker exec -e EMAIL=you@example.com -e PASSWORD='at-least-8' todolizt node scripts/create-user.mjs
```

Saving files locally does not update the running site. A deployment happens
only after the changes reach GitHub and the workflow succeeds.

The homelab image leaves `NEXT_PUBLIC_BASE_PATH` empty and runs the Next.js
server, which is what sign-in needs. It uses Node.js 20 and does not run
`npm test` or `npm run typecheck`. Local TypeScript tests require Node.js 22.18
or newer, as described above.

`npm start` serves that same server build locally. Sign-in needs this server,
so the homelab image does not use a static export.

## Agent API

Agents share the signed-in account. They do not read guest tasks stored only in a browser. Create a token on the server, the same way an account is created. The token is printed once. Store it outside the chat, in `TODOLIZT_TOKEN`.

```sh
docker exec -e EMAIL=you@example.com -e LABEL=agents todolizt node scripts/create-token.mjs
```

```sh
export TODOLIZT_URL=http://127.0.0.1:7200
export TODOLIZT_TOKEN=the-token-printed-once
export TODOLIZT_AGENT=cursor
```

`TODOLIZT_URL` is the site origin, with no path. `TODOLIZT_AGENT` is optional. Cursor defaults to `cursor` and Codex defaults to `codex` when it is unset. Send `Authorization: Bearer` with the token. Writes retry when the account document revision changes, so an agent does not send the whole task list.

List open tasks:

```sh
curl -sS -H "Authorization: Bearer $TODOLIZT_TOKEN" "$TODOLIZT_URL/api/agent/tasks?status=open"
```

Create a task. `list` is the project name. A list that does not exist yet is created. `dueDate` is a millisecond timestamp or `YYYY-MM-DD`. `agent` claims the task for that name. `priority` is optional: `high`, `medium`, or `low`.

```sh
curl -sS -H "Authorization: Bearer $TODOLIZT_TOKEN" -H "content-type: application/json" \
  -d '{"text":"Ship the invoice export","list":"billing-app","agent":"cursor"}' \
  "$TODOLIZT_URL/api/agent/tasks"
```

Claim, complete, release, or delete that task. The body is `{ "agent": "cursor" }`. Replace `$ID` with the task id from the create response. Claiming, completing, releasing, or deleting a task another agent owns returns 409. Delete moves the task to Trash for 30 days. It leaves the active list, and the same ownership rules as complete apply: an unclaimed task can be deleted, and a claimed task can be deleted only by its owner.

```sh
curl -sS -X POST -H "Authorization: Bearer $TODOLIZT_TOKEN" -H "content-type: application/json" \
  -d '{"agent":"cursor"}' "$TODOLIZT_URL/api/agent/tasks/$ID/claim"
curl -sS -X POST -H "Authorization: Bearer $TODOLIZT_TOKEN" -H "content-type: application/json" \
  -d '{"agent":"cursor"}' "$TODOLIZT_URL/api/agent/tasks/$ID/complete"
curl -sS -X POST -H "Authorization: Bearer $TODOLIZT_TOKEN" -H "content-type: application/json" \
  -d '{"agent":"cursor"}' "$TODOLIZT_URL/api/agent/tasks/$ID/release"
curl -sS -X POST -H "Authorization: Bearer $TODOLIZT_TOKEN" -H "content-type: application/json" \
  -d '{"agent":"cursor"}' "$TODOLIZT_URL/api/agent/tasks/$ID/delete"
```

`status` is `open` (the default), `done`, or `all`. Add `&agent=cursor` to keep one owner. Responses are one task, or `{ "tasks": [...] }` for the list. Failures are `{ "error": "..." }` with status 400, 401, 404, or 409.

From another repository, say: "Add a TodoLizt task for this project: ship the invoice export." The agent uses the current folder name as `list` and its own name as `agent`.

## Project structure

```text
src/
  app/                      Page, layout, theme styles, account API, and agent task API
  components/
    TodoList.tsx            Sidebar workspace and task composer
    TodoItem.tsx            Task editing, completion, and details
    BackupDialog.tsx        Backup export and import preview
    TrashPanel.tsx          Deleted-task search and restore
    ui/                     Shared interface components
  hooks/use-todos.ts        Task actions, storage state, and tab updates
  lib/todo-store.ts         Validation, transactions, backups, and task helpers
  types/todo.ts             Task data type
public/                     Logo and touch/browser icons
tests/                     Storage and task behavior tests
scripts/                    Exported asset path verification
.github/workflows/          Homelab deployment workflow
deploy/                     Example server environment file
```

## Built with

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Radix UI · next-themes ·
Zod · date-fns · Sonner · Lucide

## Contributing

Bug reports and focused improvements are welcome through
[issues](https://github.com/christiantiquis/todo-list-react/issues) and pull requests.
Include reproduction steps for bugs and run the relevant checks before submitting
a change. Use sample task data and exclude personal backups from contributions.

## Icon credit and licensing

The logo, favicon, and Apple touch icon use the
[Checklist icon by Freepik from Flaticon](https://www.flaticon.com/free-icon/checklist_4704608).
The source lists it as free for personal and commercial use with attribution under
the [Flaticon License](https://www.flaticon.com/legal#nav-flaticon). The app footer
includes the credit; retain it when redistributing the app. Icon sizes are derived
from the locally stored PNG.

The repository does not currently include a project license file. The icon's
license is separate from any license that may later be selected for the app code.
