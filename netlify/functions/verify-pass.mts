import type { Context } from "@netlify/functions";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let password;
  try {
    const body = await req.json();
    password = body?.password;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const correctPass = process.env.ENTER_PASS || 'engooo@03495144509';
  if (password === correctPass) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ success: false, error: "Incorrect password" }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
};
