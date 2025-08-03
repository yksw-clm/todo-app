"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { client } from "@/lib/hono";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const formSchema = z.object({
	title: z
		.string()
		.min(1, "タイトルは必須です。")
		.max(100, "タイトルは100文字以内で入力してください。"),
	content: z
		.string()
		.max(500, "説明は500文字以内で入力してください。")
		.optional(),
	status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
	dueDate: z.string().optional(),
});

export default function NewTaskPage() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: "",
			content: "",
			status: "TODO",
			dueDate: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		try {
			setIsSubmitting(true);

			const submitData = {
				...data,
				dueDate: data.dueDate
					? new Date(data.dueDate).toISOString()
					: undefined,
			};

			const res = await client.api.tasks.$post({ json: submitData });

			if (!res.ok) {
				const errorData = await res.json();
				form.setError("root", {
					type: "manual",
					message: errorData.error || "タスクの作成に失敗しました。",
				});
				return;
			}

			router.push("/tasks");
		} catch (error) {
			form.setError("root", {
				type: "manual",
				message: "タスクの作成に失敗しました。",
			});
			console.error("Create task error:", error);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="container mx-auto p-6 max-w-2xl">
			<div className="mb-6">
				<Button variant="ghost" onClick={() => router.back()} className="mb-4">
					<ArrowLeft className="h-4 w-4 mr-2" />
					戻る
				</Button>
				<h1 className="text-3xl font-bold">新しいタスクを作成</h1>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>タスクの詳細</CardTitle>
					<CardDescription>
						新しいタスクの情報を入力してください。
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem>
										<FormLabel>タイトル *</FormLabel>
										<FormControl>
											<Input
												placeholder="タスクのタイトルを入力してください"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="content"
								render={({ field }) => (
									<FormItem>
										<FormLabel>説明</FormLabel>
										<FormControl>
											<Textarea
												placeholder="タスクの詳細な説明を入力してください（任意）"
												className="min-h-[100px]"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem>
										<FormLabel>ステータス</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="ステータスを選択してください" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="TODO">未着手</SelectItem>
												<SelectItem value="IN_PROGRESS">進行中</SelectItem>
												<SelectItem value="DONE">完了</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="dueDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>期限</FormLabel>
										<FormControl>
											<Input type="date" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{form.formState.errors.root && (
								<div className="text-red-600 text-sm">
									{form.formState.errors.root.message}
								</div>
							)}

							<div className="flex gap-4">
								<Button
									type="submit"
									disabled={isSubmitting}
									className="flex-1"
								>
									{isSubmitting ? "作成中..." : "タスクを作成"}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => router.push("/tasks")}
									disabled={isSubmitting}
								>
									キャンセル
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
