// app/api/admin/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin with Service Role (Bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

// Define Admin credentials check (can use .env or static fallback)
function isAdminAuthorized(req: Request) {
  const adminKey = req.headers.get("x-admin-key");
  const adminEmail = req.headers.get("x-admin-email");

  const expectedEmail = process.env.ADMIN_EMAIL || "admin@ugc.dz";
  const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";

  return adminEmail === expectedEmail && adminKey === expectedPassword;
}

// 1. GET: Fetch all users from Supabase profiles
export async function GET(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Format to match the admin page fields
  const users = (profiles || []).map((p) => ({
    id: p.id,
    name: p.full_name || "مستخدم Google",
    email: p.email,
    credits: p.credits ?? 0,
    currentPack: p.credits > 3 ? "PRO_PACK" : "FREE_TRIAL",
    role: "USER",
    createdAt: p.created_at,
    _count: { generations: 0, orders: 0 },
  }));

  return NextResponse.json({ success: true, users });
}

// 2. POST: Authenticate Admin Login OR Create User
export async function POST(req: Request) {
  const body = await req.json();

  // Login Action
  if (body.action === "LOGIN") {
    const { email, password } = body;
    const expectedEmail = process.env.ADMIN_EMAIL || "admin@ugc.dz";
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (email === expectedEmail && password === expectedPassword) {
      return NextResponse.json({ success: true, message: "Logged in successfully" });
    }

    return NextResponse.json({ error: "Invalid credentials or not an admin." }, { status: 401 });
  }

  // Admin Verification
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Create User Manually in Supabase Profiles
  if (body.action === "CREATE_USER") {
    const { email, name, credits } = body;

    const { data: newUser, error } = await supabaseAdmin
      .from("profiles")
      .insert([
        {
          id: crypto.randomUUID(),
          email,
          full_name: name || "Manual Client",
          credits: parseInt(credits) || 3,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: newUser });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// 3. PUT: Edit user profile & credits in Supabase
export async function PUT(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name, credits } = await req.json();

  const { data: updatedUser, error } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: name,
      credits: parseInt(credits),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, user: updatedUser });
}

// 4. DELETE: Remove user from Supabase profiles
export async function DELETE(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("profiles").delete().eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "User deleted" });
}