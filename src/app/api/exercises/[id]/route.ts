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

    // Check if exercise exists and belongs to user
    const existingExercise = await db.exercise.findUnique({
      where: { id },
    });

    if (!existingExercise) {
      return NextResponse.json(
        { error: "Ejercicio no encontrado" },
        { status: 404 }
      );
    }

    if (existingExercise.userId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para editar este ejercicio" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, muscleGroup, secondaryMuscle, tertiaryMuscle, equipment } = body;

    const exercise = await db.exercise.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(muscleGroup !== undefined && { muscleGroup }),
        ...(secondaryMuscle !== undefined && { secondaryMuscle }),
        ...(tertiaryMuscle !== undefined && { tertiaryMuscle }),
        ...(equipment !== undefined && { equipment }),
      },
    });

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("Update exercise error:", error);
    return NextResponse.json(
      { error: "Error al actualizar ejercicio" },
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

    // Check if exercise exists and belongs to user
    const existingExercise = await db.exercise.findUnique({
      where: { id },
    });

    if (!existingExercise) {
      return NextResponse.json(
        { error: "Ejercicio no encontrado" },
        { status: 404 }
      );
    }

    if (existingExercise.userId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar este ejercicio" },
        { status: 403 }
      );
    }

    await db.exercise.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Ejercicio eliminado" });
  } catch (error) {
    console.error("Delete exercise error:", error);
    return NextResponse.json(
      { error: "Error al eliminar ejercicio" },
      { status: 500 }
    );
  }
}
