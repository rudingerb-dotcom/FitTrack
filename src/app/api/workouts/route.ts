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

    // Only return completed workouts
    const workouts = await db.workout.findMany({
      where: {
        userId,
        completedAt: { not: null },
      },
      include: {
        routine: {
          select: { id: true, name: true },
        },
        exercises: {
          include: {
            exercise: true,
            sets: {
              orderBy: { id: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    return NextResponse.json(workouts);
  } catch (error) {
    console.error("Get workouts error:", error);
    return NextResponse.json(
      { error: "Error al obtener entrenamientos" },
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
    const { routineId, name, exercises, duration } = body;

    if (!name) {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    // Create completed workout
    const workout = await db.workout.create({
      data: {
        userId,
        routineId: routineId || null,
        name,
        completedAt: new Date(),
        duration: duration || 0,
        exercises: exercises
          ? {
              create: exercises.map(
                (ex: {
                  exerciseId: string;
                  order: number;
                  sets: Array<{
                    type: string;
                    weight: number;
                    reps: number;
                    rir: number;
                    completed: boolean;
                  }>;
                }) => ({
                  exerciseId: ex.exerciseId,
                  order: ex.order ?? 0,
                  sets: ex.sets
                    ? {
                        create: ex.sets.map((set) => ({
                          type: set.type || "normal",
                          weight: set.weight || 0,
                          reps: set.reps || 0,
                          rir: set.rir || 0,
                          completed: set.completed ?? true,
                        })),
                      }
                    : undefined,
                })
              ),
            }
          : undefined,
      },
      include: {
        routine: {
          select: { id: true, name: true },
        },
        exercises: {
          include: {
            exercise: true,
            sets: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    console.error("Create workout error:", error);
    return NextResponse.json(
      { error: "Error al crear entrenamiento" },
      { status: 500 }
    );
  }
}
