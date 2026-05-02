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

    const exercises = await db.exercise.findMany({
      where: {
        OR: [{ userId }, { isDefault: true }],
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(exercises);
  } catch (error) {
    console.error("Get exercises error:", error);
    return NextResponse.json(
      { error: "Error al obtener ejercicios" },
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
    const { name, muscleGroup, secondaryMuscle, tertiaryMuscle, equipment } = body;

    if (!name || !muscleGroup) {
      return NextResponse.json(
        { error: "Nombre y grupo muscular son requeridos" },
        { status: 400 }
      );
    }

    const exercise = await db.exercise.create({
      data: {
        name,
        muscleGroup,
        secondaryMuscle: secondaryMuscle || null,
        tertiaryMuscle: tertiaryMuscle || null,
        equipment: equipment || null,
        userId,
      },
    });

    return NextResponse.json(exercise, { status: 201 });
  } catch (error) {
    console.error("Create exercise error:", error);
    return NextResponse.json(
      { error: "Error al crear ejercicio" },
      { status: 500 }
    );
  }
}
