import { TodoList } from "@/components/TodoList";
import { ThemeToggle } from "@/components/ThemeToggle"; // Import ThemeToggle

export default function Home() {
  return (
    <div className="grid grid-rows-[1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="absolute top-4 right-4">
        {" "}
        {/* Position the toggle */}
        <ThemeToggle />
      </div>
      <main className="flex flex-col gap-8 row-start-1 items-center sm:items-start">
        <TodoList />
      </main>
    </div>
  );
}
