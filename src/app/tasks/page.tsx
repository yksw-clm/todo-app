"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { client } from "@/lib/hono";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, LogOut, MoreHorizontal, Edit, Trash2 } from "lucide-react";

interface Task {
	id: string;
	title: string;
	content: string | null;
	status: "TODO" | "IN_PROGRESS" | "DONE";
	dueDate: string | null;
	createdAt: string;
	updatedAt: string;
}

export default function TasksPage() {
	const { user, isAuthenticated, logout } = useAuthStore();
	const router = useRouter();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [filter, setFilter] = useState<string>("ALL");
	const [loading, setLoading] = useState(true);

	const fetchTasks = useCallback(async () => {
		try {
			setLoading(true);
			const query =
				filter !== "ALL" ? { status: filter as Task["status"] } : {};
			const res = await client.api.tasks.$get({ query });

			if (res.ok) {
				const data = await res.json();
				setTasks(data.tasks);
			}
		} catch (error) {
			console.error("Failed to fetch tasks:", error);
		} finally {
			setLoading(false);
		}
	}, [filter]);

	useEffect(() => {
		if (!isAuthenticated) {
			router.push("/login");
			return;
		}
		fetchTasks();
	}, [isAuthenticated, router, fetchTasks]);

	const handleLogout = async () => {
		try {
			await client.api.auth.logout.$post();
			logout();
			router.push("/login");
		} catch (error) {
			console.error("Logout error:", error);
		}
	};

	const handleDeleteTask = async (taskId: string) => {
		if (!confirm("このタスクを削除しますか？")) return;

		try {
			const res = await client.api.tasks[":id"].$delete({
				param: { id: taskId },
			});

			if (res.ok) {
				setTasks(tasks.filter((task) => task.id !== taskId));
			}
		} catch (error) {
			console.error("Failed to delete task:", error);
		}
	};

	const handleStatusChange = async (taskId: string, status: Task["status"]) => {
		try {
			const res = await client.api.tasks[":id"].$put({
				param: { id: taskId },
				json: { status },
			});

			if (res.ok) {
				const data = await res.json();
				setTasks(tasks.map((task) => (task.id === taskId ? data.task : task)));
			}
		} catch (error) {
			console.error("Failed to update task status:", error);
		}
	};

	const getStatusBadgeColor = (status: Task["status"]) => {
		switch (status) {
			case "TODO":
				return "bg-gray-500";
			case "IN_PROGRESS":
				return "bg-yellow-500";
			case "DONE":
				return "bg-green-500";
			default:
				return "bg-gray-500";
		}
	};

	const getStatusText = (status: Task["status"]) => {
		switch (status) {
			case "TODO":
				return "未着手";
			case "IN_PROGRESS":
				return "進行中";
			case "DONE":
				return "完了";
			default:
				return "未着手";
		}
	};

	if (!isAuthenticated) {
		return null;
	}

	return (
		<div className="container mx-auto p-6">
			<div className="flex justify-between items-center mb-6">
				<div>
					<h1 className="text-3xl font-bold">タスク管理</h1>
					<p className="text-muted-foreground">ようこそ、{user?.email}さん</p>
				</div>
				<div className="flex gap-2">
					<Button onClick={() => router.push("/tasks/new")}>
						<Plus className="h-4 w-4 mr-2" />
						新しいタスク
					</Button>
					<Button variant="outline" onClick={handleLogout}>
						<LogOut className="h-4 w-4 mr-2" />
						ログアウト
					</Button>
				</div>
			</div>

			<div className="mb-6">
				<Select value={filter} onValueChange={setFilter}>
					<SelectTrigger className="w-[200px]">
						<SelectValue placeholder="ステータスで絞り込み" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">すべて</SelectItem>
						<SelectItem value="TODO">未着手</SelectItem>
						<SelectItem value="IN_PROGRESS">進行中</SelectItem>
						<SelectItem value="DONE">完了</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{loading ? (
				<div className="text-center py-8">
					<p>読み込み中...</p>
				</div>
			) : tasks.length === 0 ? (
				<Card>
					<CardContent className="py-8">
						<div className="text-center">
							<p className="text-muted-foreground mb-4">
								{filter === "ALL"
									? "タスクがありません。新しいタスクを作成してください。"
									: "該当するタスクがありません。"}
							</p>
							{filter === "ALL" && (
								<Button onClick={() => router.push("/tasks/new")}>
									<Plus className="h-4 w-4 mr-2" />
									最初のタスクを作成
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4">
					{tasks.map((task) => (
						<Card key={task.id} className="hover:shadow-md transition-shadow">
							<CardHeader>
								<div className="flex justify-between items-start">
									<div className="flex-1">
										<CardTitle className="text-lg">{task.title}</CardTitle>
										{task.content && (
											<CardDescription className="mt-1">
												{task.content}
											</CardDescription>
										)}
									</div>
									<div className="flex items-center gap-2">
										<Select
											value={task.status}
											onValueChange={(value) =>
												handleStatusChange(task.id, value as Task["status"])
											}
										>
											<SelectTrigger className="w-auto">
												<Badge className={getStatusBadgeColor(task.status)}>
													{getStatusText(task.status)}
												</Badge>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="TODO">未着手</SelectItem>
												<SelectItem value="IN_PROGRESS">進行中</SelectItem>
												<SelectItem value="DONE">完了</SelectItem>
											</SelectContent>
										</Select>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="sm">
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent>
												<DropdownMenuItem
													onClick={() => router.push(`/tasks/${task.id}/edit`)}
												>
													<Edit className="h-4 w-4 mr-2" />
													編集
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => handleDeleteTask(task.id)}
													className="text-red-600"
												>
													<Trash2 className="h-4 w-4 mr-2" />
													削除
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							</CardHeader>
							{task.dueDate && (
								<CardContent>
									<p className="text-sm text-muted-foreground">
										期限: {new Date(task.dueDate).toLocaleDateString("ja-JP")}
									</p>
								</CardContent>
							)}
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
