import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { handle } from "hono/vercel";
import z from "zod";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@/generated/prisma";
import { sign, verify } from "hono/jwt";
import { getCookie, setCookie } from "hono/cookie";

const prisma = new PrismaClient();

const registerSchema = z.object({
	email: z.email("正しいメールアドレスを入力してください。"),
	password: z.string().min(6, "パスワードは6文字以上で入力してください。"),
});

const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(6, "パスワードは6文字以上で入力してください。"),
});

const app = new Hono().basePath("/api/auth");

const routes = app
	// ユーザー登録
	.post("/register", zValidator("json", registerSchema), async (c) => {
		const { email, password } = c.req.valid("json");

		try {
			const existingUser = await prisma.user.findUnique({ where: { email } });
			if (existingUser) {
				return c.json(
					{ error: "このメールアドレスは既に使用されています。" },
					409,
				);
			}

			const hashedPassword = await bcrypt.hash(password, 10);
			const newUser = await prisma.user.create({
				data: {
					email,
					password: hashedPassword,
				},
			});

			const payload = {
				sub: newUser.id,
				exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24時間
			};
			const secret = process.env.JWT_SECRET || "your-secret-key";
			const token = await sign(payload, secret);

			setCookie(c, "token", token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "Lax",
				path: "/",
			});

			const { password: _, ...userWithoutPassword } = newUser;
			return c.json(
				{ message: "ユーザー登録が成功しました。", user: userWithoutPassword },
				201,
			);
		} catch (error) {
			console.error("Registration error:", error);
			return c.json({ error: "サーバーエラーが発生しました。" }, 500);
		}
	})
	// ログイン
	.post("/login", zValidator("json", loginSchema), async (c) => {
		const { email, password } = c.req.valid("json");

		try {
			const user = await prisma.user.findUnique({ where: { email } });
			if (!user) {
				return c.json(
					{ error: "メールアドレスまたはパスワードが正しくありません。" },
					401,
				);
			}

			const isPasswordValid = await bcrypt.compare(password, user.password);
			if (!isPasswordValid) {
				return c.json(
					{ error: "メールアドレスまたはパスワードが正しくありません。" },
					401,
				);
			}

			const payload = {
				sub: user.id,
				exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24時間
			};
			const secret = process.env.JWT_SECRET || "your-secret-key";
			const token = await sign(payload, secret);

			setCookie(c, "token", token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "Lax",
				path: "/",
			});

			const { password: _, ...userWithoutPassword } = user;
			return c.json({ user: userWithoutPassword }, 200);
		} catch (error) {
			console.error("Login error:", error);
			return c.json({ error: "サーバーエラーが発生しました。" }, 500);
		}
	})
	.get("/me", async (c) => {
		const token = getCookie(c, "token");

		if (!token) {
			return c.json({ error: "認証されていません。" }, 401);
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

			return c.json({ user }, 200);
		} catch (error) {
			console.error("Error verifying token:", error);
			return c.json({ error: "サーバーエラーが発生しました。" }, 500);
		}
	})
	.post("/logout", async (c) => {
		setCookie(c, "token", "", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "Lax",
			path: "/",
			expires: new Date(0),
		});

		return c.json({ message: "ログアウトしました。" });
	});

export const GET = handle(routes);
export const POST = handle(routes);
export type AuthRouteType = typeof routes;
