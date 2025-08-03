import { Button } from "@/components/ui/button";
import { MoveRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
			<div className="container flex flex-col items-center justify-center gap-6 px-4 text-center md:px-6">
				<div className="space-y-3">
					<h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
						タスク管理アプリ
					</h1>
					<p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
						タスクの新規作成・編集・削除ができます。
					</p>
				</div>
				<div className="flex flex-col gap-2 min-[400px]:flex-row">
					<Button asChild size="lg">
						<Link href="/login">ログイン</Link>
					</Button>
					<Button asChild variant="outline" size="lg">
						<Link href="/register">
							新規登録
							<MoveRight className="ml-2 h-4 w-4" />
						</Link>
					</Button>
				</div>
			</div>
		</main>
	);
}
