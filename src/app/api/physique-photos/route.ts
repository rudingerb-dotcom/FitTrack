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

    const physiquePhotos = await db.physiquePhoto.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(physiquePhotos);
  } catch (error) {
    console.error("Get physique photos error:", error);
    return NextResponse.json(
      { error: "Error al obtener fotos de físico" },
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
    const { photoUrl, date } = body;

    if (!photoUrl) {
      return NextResponse.json(
        { error: "photoUrl es requerido" },
        { status: 400 }
      );
    }

    const physiquePhoto = await db.physiquePhoto.create({
      data: {
        userId,
        photoUrl,
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json(physiquePhoto, { status: 201 });
  } catch (error) {
    console.error("Create physique photo error:", error);
    return NextResponse.json(
      { error: "Error al crear foto de físico" },
      { status: 500 }
    );
  }
}
