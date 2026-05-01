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

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Parámetro username requerido" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { username },
    });

    // If the username belongs to the current user, it's still "available" for them
    if (existingUser) {
      const userId = (session.user as any).id;
      if (existingUser.id === userId) {
        return NextResponse.json({ available: true, isCurrentUser: true });
      }
      return NextResponse.json({ available: false, isCurrentUser: false });
    }

    return NextResponse.json({ available: true, isCurrentUser: false });
  } catch (error) {
    console.error("Check username error:", error);
    return NextResponse.json(
      { error: "Error al verificar nombre de usuario" },
      { status: 500 }
    );
  }
}
