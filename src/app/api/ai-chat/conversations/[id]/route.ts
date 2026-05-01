import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET(
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

    // Check plan
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.plan === "free") {
      return NextResponse.json(
        { error: "Requiere plan Pro" },
        { status: 403 }
      );
    }

    const conversation = await db.aIConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversación no encontrada" },
        { status: 404 }
      );
    }

    if (conversation.userId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para ver esta conversación" },
        { status: 403 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Get conversation error:", error);
    return NextResponse.json(
      { error: "Error al obtener conversación" },
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

    // Check plan
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.plan === "free") {
      return NextResponse.json(
        { error: "Requiere plan Pro" },
        { status: 403 }
      );
    }

    const conversation = await db.aIConversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversación no encontrada" },
        { status: 404 }
      );
    }

    if (conversation.userId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar esta conversación" },
        { status: 403 }
      );
    }

    await db.aIConversation.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Conversación eliminada" });
  } catch (error) {
    console.error("Delete conversation error:", error);
    return NextResponse.json(
      { error: "Error al eliminar conversación" },
      { status: 500 }
    );
  }
}
