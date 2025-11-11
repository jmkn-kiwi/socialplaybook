// app/api/hello/route.ts
import { NextResponse } from "next/server";

/**
 * Handles GET requests to /api/hello
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Hello from your backend 🎉",
  });
}
