import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Uniform JSON error handling for route handlers. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof ZodError) {
      return NextResponse.json(
        {
          error: `Validation failed: ${e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")}`,
        },
        { status: 400 },
      );
    }
    const message = e instanceof Error ? e.message : "Internal error";
    // Prisma "not found" errors surface as 404s.
    const status = /not found|No .* found/i.test(message) ? 404 : 500;
    console.error("[api]", e);
    return NextResponse.json({ error: message }, { status });
  }
}
