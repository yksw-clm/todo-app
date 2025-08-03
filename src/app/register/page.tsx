"use client";

import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { client } from "@/lib/hono";
import { useRouter } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";

const formSchema = z
	.object({
		email: z.email(),
		password: z.string().min(6, "パスワードは6文字以上で入力してください。"),
		confirmPassword: z
			.string()
			.min(6, "パスワードは6文字以上で入力してください。"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		path: ["confirmPassword"],
		message: "パスワードが一致しません。",
	});

export default function RegisterPage() {
	const router = useRouter();
	const { setUser, isAuthenticated } = useAuthStore();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	useEffect(() => {
		if (isAuthenticated) {
			router.push("/tasks");
		}
	}, [isAuthenticated, router]);

	async function onSubmit(data: z.infer<typeof formSchema>) {
		try {
			const res = await client.api.auth.register.$post({ json: data });

			if (!res.ok) {
				const data = await res.json();
				form.setError("password", {
					type: "manual",
					message: data.error,
				});
				return;
			}

			const userData = await res.json();
			setUser(userData.user);
			router.push("/tasks");
		} catch (error) {
			form.setError("password", {
				type: "manual",
				message: "ログインに失敗しました。",
			});
			console.error("Login error:", error);
		}
	}

	return (
		<div className="flex items-center justify-center min-h-screen">
			<Card className="w-[350px]">
				<CardHeader>
					<CardTitle>新規登録</CardTitle>
					<CardDescription>新しいアカウントを作成します。</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>メールアドレス</FormLabel>
										<FormControl>
											<Input placeholder="user@example.com" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>パスワード</FormLabel>
										<FormControl>
											<Input type="password" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="confirmPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>パスワード（確認）</FormLabel>
										<FormControl>
											<Input type="password" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit" className="w-full">
								登録
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
