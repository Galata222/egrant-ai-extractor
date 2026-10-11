export const runtime = "nodejs";
export const maxDuration = 60;

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const upstream = await fetch(`${API_URL}/agent/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return Response.json({ detail: { code: "agent_failed" } }, { status: 502 });
  }
}
