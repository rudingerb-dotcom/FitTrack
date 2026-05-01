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

    const oneRepMaxes = await db.oneRepMax.findMany({
      where: { userId },
      include: {
        exercise: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(oneRepMaxes);
  } catch (error) {
    console.error("Get 1RM error:", error);
    return NextResponse.json(
      { error: "Error al obtener 1RM" },
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
    const { exerciseId, weight, date } = body;

    if (!exerciseId || weight === undefined) {
      return NextResponse.json(
        { error: "exerciseId y weight son requeridos" },
        { status: 400 }
      );
    }

    // Check if exercise belongs to user
    const exercise = await db.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise || exercise.userId !== userId) {
      return NextResponse.json(
        { error: "Ejercicio no encontrado" },
        { status: 404 }
      );
    }

    // Check if there's an existing 1RM for this exercise
    const existing = await db.oneRepMax.findFirst({
      where: { userId, exerciseId },
    });

    let oneRepMax;
    if (existing) {
      // Update existing 1RM if new weight is higher
      oneRepMax = await db.oneRepMax.update({
        where: { id: existing.id },
        data: {
          weight,
          ...(date && { date: new Date(date) }),
        },
        include: { exercise: true },
      });
    } else {
      // Create new 1RM
      oneRepMax = await db.oneRepMax.create({
        data: {
          userId,
          exerciseId,
          weight,
          ...(date && { date: new Date(date) }),
        },
        include: { exercise: true },
      });
    }

    return NextResponse.json(oneRepMax);
  } catch (error) {
    console.error("Create/update 1RM error:", error);
    return NextResponse.json(
      { error: "Error al crear/actualizar 1RM" },
      { status: 500 }
    );
  }
}
