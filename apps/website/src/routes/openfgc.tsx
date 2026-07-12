import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/openfgc")({
  beforeLoad: () => {
    throw redirect({ href: "/projects/openfgc", statusCode: 301 });
  },
});
