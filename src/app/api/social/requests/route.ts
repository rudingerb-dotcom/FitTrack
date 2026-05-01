import { NextResponse } from "next/server";
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

    // Get pending friend requests sent to and from the user
    const [sent, received] = await Promise.all([
      db.friendship.findMany({
        where: {
          requesterId: userId,
          status: "pending",
        },
        include: {
          addressee: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.friendship.findMany({
        where: {
          addresseeId: userId,
          status: "pending",
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
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const sentFormatted = sent.map((f) => ({
      id: f.id,
      type: "sent" as const,
      user: f.addressee,
      createdAt: f.createdAt,
    }));

    const receivedFormatted = received.map((f) => ({
      id: f.id,
      type: "received" as const,
      user: f.requester,
      createdAt: f.createdAt,
    }));

    return NextResponse.json({
      sent: sentFormatted,
      received: receivedFormatted,
    });
  } catch (error) {
    console.error("Get friend requests error:", error);
    return NextResponse.json(
      { error: "Error al obtener solicitudes de amistad" },
      { status: 500 }
    );
  }
}
