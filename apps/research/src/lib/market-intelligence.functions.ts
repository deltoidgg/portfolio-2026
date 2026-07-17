import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { deadlineRoomQuerySchema } from "market-intelligence";
import { readDeadlineRoom } from "./market-intelligence.server.ts";

export const getDeadlineRoom = createServerFn({ method: "GET" })
  .validator(deadlineRoomQuerySchema)
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    return readDeadlineRoom(data);
  });
