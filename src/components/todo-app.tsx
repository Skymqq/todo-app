"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Todo = {
  id: number;
  title: string;
  is_complete: boolean;
  created_at: string;
};

export default function TodoApp() {
  const [userId, setUserId] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
    });
  }, [router, supabase]);

  const fetchTodos = useCallback(async () => {
    const { data } = await supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setTodos(data);
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    fetchTodos();

    const channel = supabase
      .channel("todos-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todos",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTodos((prev) => [payload.new as Todo, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setTodos((prev) =>
              prev.map((t) =>
                t.id === (payload.new as Todo).id
                  ? (payload.new as Todo)
                  : t
              )
            );
          } else if (payload.eventType === "DELETE") {
            setTodos((prev) =>
              prev.filter((t) => t.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, fetchTodos]);

  async function addTodo() {
    if (!newTitle.trim() || !userId) return;
    await supabase.from("todos").insert({
      title: newTitle.trim(),
      user_id: userId,
    });
    setNewTitle("");
  }

  async function toggleTodo(id: number, isComplete: boolean) {
    await supabase
      .from("todos")
      .update({ is_complete: !isComplete })
      .eq("id", id);
  }

  async function deleteTodo(id: number) {
    await supabase.from("todos").delete().eq("id", id);
  }

  async function saveEdit(id: number) {
    if (!editTitle.trim()) return;
    await supabase
      .from("todos")
      .update({ title: editTitle.trim() })
      .eq("id", id);
    setEditingId(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Todos</h1>
        <button
          onClick={signOut}
          className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300"
        >
          Sign Out
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          placeholder="What needs to be done?"
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={addTodo}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add
        </button>
      </div>

      <ul className="space-y-2">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3"
          >
            <input
              type="checkbox"
              checked={todo.is_complete}
              onChange={() => toggleTodo(todo.id, todo.is_complete)}
              className="h-4 w-4 rounded border-gray-300"
            />
            {editingId === todo.id ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(todo.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="flex-1 rounded border px-2 py-1 text-sm outline-none focus:border-blue-500"
                autoFocus
              />
            ) : (
              <span
                className={`flex-1 text-sm ${
                  todo.is_complete
                    ? "text-gray-400 line-through"
                    : "text-gray-900"
                }`}
                onDoubleClick={() => {
                  setEditingId(todo.id);
                  setEditTitle(todo.title);
                }}
              >
                {todo.title}
              </span>
            )}
            {editingId === todo.id ? (
              <button
                onClick={() => saveEdit(todo.id)}
                className="text-xs text-blue-600 hover:underline"
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            )}
          </li>
        ))}
        {todos.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">
            No todos yet. Add one above!
          </p>
        )}
      </ul>
    </div>
  );
}
