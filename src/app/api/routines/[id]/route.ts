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

    const routine = await db.routine.findUnique({
      where: { id },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!routine) {
      return NextResponse.json(
        { error: "Rutina no encontrada" },
        { status: 404 }
      );
    }

    if (routine.userId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para ver esta rutina" },
        { status: 403 }
      );
    }

    // Parse setsConfig from JSON string
    const routineWithParsedConfig = {
      ...routine,
      exercises: routine.exercises.map((re) => ({
        ...re,
        setsConfig: JSON.parse(re.setsConfig),
      })),
    };

    return NextResponse.json(routineWithParsedConfig);
  } catch (error) {
    console.error("Get routine error:", error);
    return NextResponse.json(
      { error: "Error al obtener rutina" },
      { status: 500 }
    );
  }
}

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

    // Check if routine exists and belongs to user
    const existingRoutine = await db.routine.findUnique({
      where: { id },
    });

    if (!existingRoutine) {
      return NextResponse.json(
        { error: "Rutina no encontrada" },
        { status: 404 }
      );
    }

    if (existingRoutine.userId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para editar esta rutina" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, exercises } = body;

    // Update routine basic info
    await db.routine.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    });

    // If exercises provided, replace all routine exercises
    if (exercises !== undefined) {
      // Delete existing routine exercises
      await db.routineExercise.deleteMany({
        where: { routineId: id },
      });

      // Create new routine exercises
      if (exercises.length > 0) {
        await db.routineExercise.createMany({
          data: exercises.map(
            (ex: {
              exerciseId: string;
              order: number;
              setsConfig: Array<{
                type: string;
                weight: number;
                reps: number;
                rir: number;
              }>;
            }) => ({
              routineId: id,
              exerciseId: ex.exerciseId,
              order: ex.order ?? 0,
              setsConfig: JSON.stringify(ex.setsConfig || []),
            })
          ),
        });
      }
    }

    // Fetch updated routine with exercises
    const updatedRoutine = await db.routine.findUnique({
      where: { id },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    // Parse setsConfig for response
    const routineWithParsedConfig = {
      ...updatedRoutine,
      exercises: updatedRoutine?.exercises.map((re) => ({
        ...re,
        setsConfig: JSON.parse(re.setsConfig),
      })),
    };

    return NextResponse.json(routineWithParsedConfig);
  } catch (error) {
    console.error("Update routine error:", error);
    return NextResponse.json(
      { error: "Error al actualizar rutina" },
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

    // Check if routine exists and belongs to user
    const existingRoutine = await db.routine.findUnique({
      where: { id },
    });

    if (!existingRoutine) {
      return NextResponse.json(
        { error: "Rutina no encontrada" },
        { status: 404 }
      );
    }

    if (existingRoutine.userId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar esta rutina" },
        { status: 403 }
      );
    }

    await db.routine.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Rutina eliminada" });
  } catch (error) {
    console.error("Delete routine error:", error);
    return NextResponse.json(
      { error: "Error al eliminar rutina" },
      { status: 500 }
    );
  }
}
