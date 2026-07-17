import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { deadlineRoomQuerySchema, opportunityMapQuerySchema } from "market-intelligence";
import { readDeadlineRoom, readOpportunityMap } from "./market-intelligence.server.ts";

export const getDeadlineRoom = createServerFn({ method: "GET" })
  .validator(deadlineRoomQuerySchema)
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    return readDeadlineRoom(data);
  });

export const getOpportunityMap = createServerFn({ method: "GET" })
  .validator(opportunityMapQuerySchema)
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return readOpportunityMap(data);
  });
