This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This To-Do List application now includes:
*   **Task Management**: Add, toggle completion, edit, and delete todo items.
*   **Categories**: Assign and manage custom categories for your tasks.
*   **Due Dates**: Set and track deadlines for your todos.
*   **Filtering**: Filter tasks by category and completion status.
*   **Sorting**: Organize tasks by default order, completed last, or alphabetically.
*   **Search**: Quickly find tasks by searching their text.

The interface uses system fonts so builds and previews do not require downloading fonts.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
## Data safety and task controls

Tasks stay in this browser; there is no account or device sync. Existing `todo-list`
and `todo-categories` entries are migrated to a single validated `todo-data-v1`
snapshot. Legacy entries are retained. Invalid saved content is copied verbatim to
`<original-key>.recovery.<unique-id>` in local storage before replacement. If reading
or creating that copy fails, saving is paused and the page displays a warning.
Recovery copies can be retrieved through the browser's developer tools under
Application > Local Storage. Clearing site data also removes these copies.

My Day shows active tasks due today plus overdue tasks. Upcoming shows active
tasks due after today, using the browser's local calendar. Due-date sorting puts undated tasks last.
Deletion and clearing completed tasks move tasks to Trash for 30 days, with a quick Undo for 10 seconds. Task details open
by click, touch, or keyboard. Custom category names such as `All` and `none` are supported.

## Checks

Use Node.js 22.18 or newer for the built-in TypeScript test runner:

```sh
npm test
npm run typecheck
npm run build
```

Tests cover saved-data validation and recovery, migration, edits, category deletion,
deadline boundaries, filtering, sorting, and undo behavior.

## TodoLizt workspace

The sidebar opens My Day, All Tasks, Upcoming, Completed, and category lists.
Existing task categories are shown as lists without changing stored assignments.
My Day starts the app and includes active tasks due today or earlier; it does not
include undated tasks. All Tasks includes every task, with completed tasks collapsed.
Search applies to the current view. Counts in the sidebar show active tasks, except
Completed, which counts completed tasks.

The task composer assigns today's date in My Day, tomorrow's date in Upcoming,
and the selected list when browsing a list. Expand "List & due date" to change or
clear those defaults. If you choose a date outside the current view, a notification
points you to All Tasks. Manage lists with the plus button beside "Your lists".
The mobile header's menu button opens navigation. Light, dark, and system themes
remain available in the header.

## Backups, Trash, and multiple tabs

Open **Data & backup** at the bottom of the sidebar to export a versioned JSON
backup or choose a backup to import. Backups include tasks, custom lists, and
unexpired Trash. Import validates the entire file and previews the number of new
tasks before you select **Merge backup**. Files larger than 5 MB or unsupported
formats are rejected. Existing IDs are kept unchanged, including deleted tasks;
import never replaces current tasks or resurrects tasks already in Trash. Repeating
an import does not duplicate those tasks. Downloaded backups are readable files;
keep them in a private location.

**Trash** offers individual and bulk restore for 30 days after deletion. Expired
items are filtered immediately and pruned from saved storage on startup, while the
app is open, and before writes. Restoring keeps completion and deadline details.
If the original list no longer exists, the task is restored without a list.
There is no permanent-delete button. Historical legacy entries and recovery copies
are retained separately; Trash expiry is not a secure erase of those copies.

Updated tabs on the same browser origin coordinate all writes with Web Locks,
re-read the latest snapshot before changing it, and refresh from storage events.
Unrelated changes are combined. Editing the same task from a stale draft is rejected
without overwriting the newer task; cancel editing to load the latest version.
Failed saves keep the draft instead of displaying an unsaved change as successful.
A cleared or rolled-back snapshot cannot be silently recreated by a stale tab.

Saving requires Web Locks in a current browser over HTTPS or localhost. Where
coordination is unavailable, the app permits viewing and exporting but pauses
writes. After upgrading an already open app, reload all its tabs so every tab uses
the same storage protocol. This protects same-origin tabs, not different browsers,
devices, or older versions of the app. Data still lives in `todo-data-v1`, with
backwards-compatible Trash and revision fields; accounts and cloud sync are not
included. Clearing site data removes saved tasks, Trash, and local recovery copies.

## Icon credit

TodoLizt uses the [Checklist icon by Freepik from Flaticon](https://www.flaticon.com/free-icon/checklist_4704608)
for its sidebar logo, favicon, and Apple touch icon. The source page lists the
[Flaticon License](https://www.flaticon.com/legal#nav-flaticon) as free for personal
and commercial use with attribution. The footer includes the author credit.
The PNG is stored locally in `public/todolizt-logo.png`; the other icon files are
resized versions. Keep the attribution when distributing the app.
