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

    // Get accepted friendships where user is either requester or addressee
    const friendships = await db.friendship.findMany({
      where: {
        status: "accepted",
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            plan: true,
          },
        },
        addressee: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            plan: true,
          },
        },
      },
    });

    // Map to return friend info
    const friends = friendships.map((friendship) => {
      const friend = friendship.requesterId === userId
        ? friendship.addressee
        : friendship.requester;
      return {
        friendshipId: friendship.id,
        ...friend,
      };
    });

    return NextResponse.json(friends);
  } catch (error) {
    console.error("Get friends error:", error);
    return NextResponse.json(
      { error: "Error al obtener amigos" },
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
    const body = await request.json();
    const { userId: targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "userId es requerido" },
        { status: 400 }
      );
    }

    if (targetUserId === userId) {
      return NextResponse.json(
        { error: "No puedes enviarte una solicitud de amistad a ti mismo" },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Check if friendship already exists
    const existingFriendship = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: userId },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === "pending") {
        return NextResponse.json(
          { error: "Ya existe una solicitud de amistad pendiente" },
          { status: 409 }
        );
      }
      if (existingFriendship.status === "accepted") {
        return NextResponse.json(
          { error: "Ya son amigos" },
          { status: 409 }
        );
      }
    }

    // Create friend request
    const friendship = await db.friendship.create({
      data: {
        requesterId: userId,
        addresseeId: targetUserId,
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
    });

    return NextResponse.json(friendship, { status: 201 });
  } catch (error) {
    console.error("Send friend request error:", error);
    return NextResponse.json(
      { error: "Error al enviar solicitud de amistad" },
      { status: 500 }
    );
  }
}
