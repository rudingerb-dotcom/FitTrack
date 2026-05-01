import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { error: "Parámetro de búsqueda requerido" },
        { status: 400 }
      );
    }

    const users = await db.user.findMany({
      where: {
        username: {
          contains: q,
        },
        id: { not: userId }, // Exclude current user
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        plan: true,
      },
      take: 20,
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Search users error:", error);
    return NextResponse.json(
      { error: "Error al buscar usuarios" },
      { status: 500 }
    );
  }
}
