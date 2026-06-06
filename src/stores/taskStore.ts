import { create } from "zustand";

interface Task {
  id: string;
  text: string;
  status: "running" | "done" | "error";
  progress: number;
}

interface TaskStore {
  tasks: Task[];
  visible: boolean;
  setVisible: (v: boolean) => void;
  addTask: (task: Omit<Task, "id">) => string;
  removeTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  visible: false,
  setVisible: (visible) => set({ visible }),
  addTask: (task) => {
    const id = `task_${Date.now()}`;
    set((s) => ({ tasks: [...s.tasks, { ...task, id }], visible: true }));
    return id;
  },
  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
}));
