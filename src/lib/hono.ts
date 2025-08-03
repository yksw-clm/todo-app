import { hc } from "hono/client";
import type { AuthRouteType } from "@/app/api/auth/[[...route]]/route";
import type { TasksRouteType } from "@/app/api/tasks/[[...route]]/route";

export const client = hc<AuthRouteType | TasksRouteType>("/");
