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

    const conversations = await db.aIConversation.findMany({
      where: { userId },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    return NextResponse.json(
      { error: "Error al obtener conversaciones" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;

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

    const body = await request.json();
    const { title } = body;

    const conversation = await db.aIConversation.create({
      data: {
        userId,
        title: title || "Nueva conversación",
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: "Error al crear conversación" },
      { status: 500 }
    );
  }
}
