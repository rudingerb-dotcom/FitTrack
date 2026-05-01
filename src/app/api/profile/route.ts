import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        oneRepMaxes: {
          include: {
            exercise: true,
          },
          orderBy: { date: "desc" },
        },
        _count: {
          select: {
            physiquePhotos: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      ...userWithoutPassword,
      physiquePhotosCount: user._count.physiquePhotos,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Error al obtener perfil" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { name, username, bio, avatarUrl } = body;

    // Check if username is taken by another user
    if (username) {
      const existingUser = await db.user.findUnique({
        where: { username },
      });

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json(
          { error: "El nombre de usuario ya está en uso" },
          { status: 409 }
        );
      }
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(username !== undefined && { username }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Error al actualizar perfil" },
      { status: 500 }
    );
  }
}
