import { createFileRoute, redirect } from "@tanstack/react-router";
import { defaultOpportunitySearch } from "../lib/opportunity-search.ts";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/opportunities", search: defaultOpportunitySearch });
  },
});
