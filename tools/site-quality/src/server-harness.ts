import { spawn, type ChildProcess } from "node:child_process";
import { kill } from "node:process";

export interface ServerTarget {
  cwd: string;
  origin: string;
  port: string;
}

export function startServer(target: ServerTarget): ChildProcess {
  return spawn("vp", ["dev", "--host", "127.0.0.1", "--port", target.port], {
    cwd: target.cwd,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export async function waitForServer(origin: string, process: ChildProcess): Promise<void> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(`Dev server stopped with ${process.exitCode}`);
    }
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${origin}`);
}

export function stopServer(process: ChildProcess): void {
  if (!process.pid) return;
  try {
    kill(-process.pid, "SIGTERM");
  } catch {
    process.kill("SIGTERM");
  }
}
