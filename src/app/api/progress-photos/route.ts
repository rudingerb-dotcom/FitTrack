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

    const progressPhotos = await db.progressPhoto.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(progressPhotos);
  } catch (error) {
    console.error("Get progress photos error:", error);
    return NextResponse.json(
      { error: "Error al obtener fotos de progreso" },
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
    const { photoUrl, date, bodyWeight, note } = body;

    if (!photoUrl) {
      return NextResponse.json(
        { error: "photoUrl es requerido" },
        { status: 400 }
      );
    }

    const progressPhoto = await db.progressPhoto.create({
      data: {
        userId,
        photoUrl,
        date: date ? new Date(date) : new Date(),
        bodyWeight: bodyWeight || null,
        note: note || null,
      },
    });

    return NextResponse.json(progressPhoto, { status: 201 });
  } catch (error) {
    console.error("Create progress photo error:", error);
    return NextResponse.json(
      { error: "Error al crear foto de progreso" },
      { status: 500 }
    );
  }
}
