import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Acción requerida: 'accept' o 'reject'" },
        { status: 400 }
      );
    }

    const friendship = await db.friendship.findUnique({
      where: { id },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "Solicitud de amistad no encontrada" },
        { status: 404 }
      );
    }

    // Only the addressee can accept or reject
    if (friendship.addresseeId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para realizar esta acción" },
        { status: 403 }
      );
    }

    if (friendship.status !== "pending") {
      return NextResponse.json(
        { error: "Esta solicitud ya ha sido procesada" },
        { status: 400 }
      );
    }

    const updatedFriendship = await db.friendship.update({
      where: { id },
      data: {
        status: action === "accept" ? "accepted" : "rejected",
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        addressee: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json(updatedFriendship);
  } catch (error) {
    console.error("Accept/reject friend request error:", error);
    return NextResponse.json(
      { error: "Error al procesar solicitud de amistad" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = await params;

    const friendship = await db.friendship.findUnique({
      where: { id },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "Amistad no encontrada" },
        { status: 404 }
      );
    }

    // Both users can remove friendship
    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar esta amistad" },
        { status: 403 }
      );
    }

    await db.friendship.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Amigo eliminado" });
  } catch (error) {
    console.error("Remove friend error:", error);
    return NextResponse.json(
      { error: "Error al eliminar amigo" },
      { status: 500 }
    );
  }
}
