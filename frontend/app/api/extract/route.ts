export const runtime = "nodejs";
export const maxDuration = 60;

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();
    const file = incoming.get("file");
    if (!(file instanceof File)) {
      return Response.json({ detail: "Súbor chýba." }, { status: 400 });
    }
    const body = new FormData();
    body.append("file", file, file.name);
    const mapping = incoming.get("mapping");
    if (typeof mapping === "string" && mapping.trim()) {
      body.append("mapping", mapping);
    }
    const upstream = await fetch(`${API_URL}/extract`, { method: "POST", body });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return Response.json(
      { detail: "Backend nie je dostupný. Spustite FastAPI na porte 8000." },
      { status: 502 },
    );
  }
}
