import { hc } from "hono/client";
import type { AuthRouteType } from "@/app/api/auth/[[...route]]/route";

export const client = hc<AuthRouteType>("/");
