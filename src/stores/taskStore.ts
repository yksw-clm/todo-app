import { create } from "zustand";

export interface Task {
	id: string;
	title: string;
	description?: string;
	status: "TODO" | "IN_PROGRESS" | "DONE";
	dueDate?: string;
	createdAt: string;
	updatedAt: string;
}

interface TaskState {
	tasks: Task[];
	filter: string;
	loading: boolean;
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	setTasks: (tasks: Task[]) => void;
	addTask: (task: Task) => void;
	updateTask: (id: string, updates: Partial<Task>) => void;
	removeTask: (id: string) => void;
	setFilter: (filter: string) => void;
	setLoading: (loading: boolean) => void;
	setPagination: (pagination: TaskState["pagination"]) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
	tasks: [],
	filter: "ALL",
	loading: false,
	pagination: {
		page: 1,
		limit: 10,
		total: 0,
		totalPages: 0,
	},
	setTasks: (tasks) => set({ tasks }),
	addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
	updateTask: (id, updates) =>
		set((state) => ({
			tasks: state.tasks.map((task) =>
				task.id === id ? { ...task, ...updates } : task,
			),
		})),
	removeTask: (id) =>
		set((state) => ({
			tasks: state.tasks.filter((task) => task.id !== id),
		})),
	setFilter: (filter) => set({ filter }),
	setLoading: (loading) => set({ loading }),
	setPagination: (pagination) => set({ pagination }),
}));
