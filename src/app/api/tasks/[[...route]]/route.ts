import { PrismaClient } from "@/generated/prisma";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { handle } from "hono/vercel";

const prisma = new PrismaClient();

const querySchema = z.object({
	status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
	page: z.string().transform(Number).pipe(z.number().min(1)).default(1),
	limit: z
		.string()
		.transform(Number)
		.pipe(z.number().min(1).max(100))
		.default(10),
});
const createTaskSchema = z.object({
	title: z
		.string()
		.min(1, "タイトルは必須です。")
		.max(100, "タイトルは100文字以内で入力してください。"),
	content: z
		.string()
		.max(500, "説明は500文字以内で入力してください。")
		.optional(),
	status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
	dueDate: z.string().datetime().optional(),
});
const updateTaskSchema = z.object({
	title: z
		.string()
		.min(1, "タイトルは必須です。")
		.max(100, "タイトルは100文字以内で入力してください。")
		.optional(),
	content: z
		.string()
		.max(500, "説明は500文字以内で入力してください。")
		.optional(),
	status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
	dueDate: z.string().datetime().optional().nullable(),
});

const app = new Hono().basePath("/api/tasks");

const authMiddleware = createMiddleware<{
	Variables: { user: { id: string; email: string } };
}>(async (c, next) => {
	const token = getCookie(c, "token");

	if (!token) {
		return c.json({ error: "認証が必要です。" }, 401);
	}

	try {
		const secret = process.env.JWT_SECRET || "your-secret-key";
		const payload = await verify(token, secret);

		const user = await prisma.user.findUnique({
			where: { id: payload.sub as string },
			select: { id: true, email: true },
		});

		if (!user) {
			return c.json({ error: "ユーザーが見つかりません。" }, 404);
		}

		c.set("user", user);
		await next();
	} catch (error) {
		console.error("JWT verification failed:", error);
		return c.json({ error: "無効なトークンです。" }, 401);
	}
});

const routes = app
	.use("*", authMiddleware)
	.get("/", zValidator("query", querySchema), async (c) => {
		const user = c.get("user");
		const { status, page, limit } = c.req.valid("query");
		const offset = (page - 1) * limit;

		try {
			const where = {
				userId: user.id,
				...(status && { status }),
			};

			const [tasks, total] = await Promise.all([
				prisma.task.findMany({
					where,
					orderBy: [
						{ status: "asc" },
						{ dueDate: "asc" },
						{ createdAt: "desc" },
					],
					skip: offset,
					take: limit,
				}),
				prisma.task.count({ where }),
			]);

			return c.json({
				tasks,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		} catch (error) {
			console.error("Failed to fetch tasks:", error);
			return c.json({ error: "タスクの取得に失敗しました。" }, 500);
		}
	})
	.post("/", zValidator("json", createTaskSchema), async (c) => {
		const user = c.get("user");
		const data = c.req.valid("json");

		try {
			const task = await prisma.task.create({
				data: {
					title: data.title,
					content: data.content,
					status: data.status,
					dueDate: data.dueDate ? new Date(data.dueDate) : null,
					userId: user.id,
				},
			});

			return c.json({ task }, 201);
		} catch (error) {
			console.error("Failed to create task:", error);
			return c.json({ error: "タスクの作成に失敗しました。" }, 500);
		}
	})
	.get("/:id", async (c) => {
		const user = c.get("user");
		const taskId = c.req.param("id");

		try {
			const task = await prisma.task.findFirst({
				where: {
					id: taskId,
					userId: user.id,
				},
			});

			if (!task) {
				return c.json({ error: "タスクが見つかりません。" }, 404);
			}

			return c.json({ task });
		} catch (error) {
			console.error("Failed to fetch task:", error);
			return c.json({ error: "タスクの取得に失敗しました。" }, 500);
		}
	})
	.put("/:id", zValidator("json", updateTaskSchema), async (c) => {
		const user = c.get("user");
		const taskId = c.req.param("id");
		const data = c.req.valid("json");

		try {
			// タスクの存在確認と所有者チェック
			const existingTask = await prisma.task.findFirst({
				where: {
					id: taskId,
					userId: user.id,
				},
			});

			if (!existingTask) {
				return c.json({ error: "タスクが見つかりません。" }, 404);
			}

			const updateData: any = {};
			if (data.title !== undefined) updateData.title = data.title;
			if (data.content !== undefined) updateData.content = data.content;
			if (data.status !== undefined) updateData.status = data.status;
			if (data.dueDate !== undefined) {
				updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
			}

			const task = await prisma.task.update({
				where: { id: taskId },
				data: updateData,
			});

			return c.json({ task }, 200);
		} catch (error) {
			console.error("Failed to update task:", error);
			return c.json({ error: "タスクの更新に失敗しました。" }, 500);
		}
	})
	.delete("/:id", async (c) => {
		const user = c.get("user");
		const taskId = c.req.param("id");

		try {
			// タスクの存在確認と所有者チェック
			const existingTask = await prisma.task.findFirst({
				where: {
					id: taskId,
					userId: user.id,
				},
			});

			if (!existingTask) {
				return c.json({ error: "タスクが見つかりません。" }, 404);
			}

			await prisma.task.delete({
				where: { id: taskId },
			});

			return c.json({ message: "タスクを削除しました。" }, 200);
		} catch (error) {
			console.error("Failed to delete task:", error);
			return c.json({ error: "タスクの削除に失敗しました。" }, 500);
		}
	})
	.patch(
		"/bulk-status",
		zValidator(
			"json",
			z.object({
				taskIds: z.array(z.string()),
				status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
			}),
		),
		async (c) => {
			const user = c.get("user");
			const { taskIds, status } = c.req.valid("json");

			try {
				const updatedTasks = await prisma.task.updateMany({
					where: {
						id: { in: taskIds },
						userId: user.id,
					},
					data: { status },
				});

				return c.json({
					message: `${updatedTasks.count}件のタスクのステータスを更新しました。`,
					count: updatedTasks.count,
				});
			} catch (error) {
				console.error("Failed to bulk update tasks:", error);
				return c.json({ error: "タスクの一括更新に失敗しました。" }, 500);
			}
		},
	);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export type TasksRouteType = typeof routes;
