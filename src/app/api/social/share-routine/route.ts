import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { routineId, friendId } = body;

    if (!routineId || !friendId) {
      return NextResponse.json(
        { error: "routineId y friendId son requeridos" },
        { status: 400 }
      );
    }

    // Check if routine exists and belongs to user
    const routine = await db.routine.findUnique({
      where: { id: routineId },
    });

    if (!routine || routine.userId !== userId) {
      return NextResponse.json(
        { error: "Rutina no encontrada" },
        { status: 404 }
      );
    }

    // Check if friend exists and is actually a friend
    const friendship = await db.friendship.findFirst({
      where: {
        status: "accepted",
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "Solo puedes compartir rutinas con amigos" },
        { status: 403 }
      );
    }

    // Check if already shared
    const existingShare = await db.routineShare.findFirst({
      where: {
        routineId,
        receiverId: friendId,
        status: "pending",
      },
    });

    if (existingShare) {
      return NextResponse.json(
        { error: "Ya has compartido esta rutina con este usuario" },
        { status: 409 }
      );
    }

    // Create share
    const share = await db.routineShare.create({
      data: {
        routineId,
        senderId: userId,
        receiverId: friendId,
        status: "pending",
      },
      include: {
        routine: {
          select: { id: true, name: true, description: true },
        },
        receiver: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    console.error("Share routine error:", error);
    return NextResponse.json(
      { error: "Error al compartir rutina" },
      { status: 500 }
    );
  }
}
