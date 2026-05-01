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

    // Get current active (incomplete) workout
    const activeWorkout = await db.workout.findFirst({
      where: {
        userId,
        completedAt: null,
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
    });

    if (!activeWorkout) {
      return NextResponse.json(null);
    }

    return NextResponse.json(activeWorkout);
  } catch (error) {
    console.error("Get active workout error:", error);
    return NextResponse.json(
      { error: "Error al obtener entrenamiento activo" },
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

    // Check if there's already an active workout
    const existingActive = await db.workout.findFirst({
      where: {
        userId,
        completedAt: null,
      },
    });

    if (existingActive) {
      return NextResponse.json(
        { error: "Ya tienes un entrenamiento activo" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { routineId, name } = body;

    // If starting from a routine, get routine exercises to pre-populate
    let exerciseData: Array<{
      exerciseId: string;
      order: number;
      sets: Array<{
        type: string;
        weight: number;
        reps: number;
        rir: number;
        completed: boolean;
      }>;
    }> = [];

    if (routineId) {
      const routine = await db.routine.findUnique({
        where: { id: routineId },
        include: {
          exercises: {
            include: {
              exercise: true,
            },
            orderBy: { order: "asc" },
          },
        },
      });

      if (routine && routine.userId === userId) {
        exerciseData = routine.exercises.map((re) => {
          const setsConfig = JSON.parse(re.setsConfig) as Array<{
            type: string;
            weight: number;
            reps: number;
            rir: number;
          }>;
          return {
            exerciseId: re.exerciseId,
            order: re.order,
            sets: setsConfig.map((s) => ({
              type: s.type || "normal",
              weight: s.weight || 0,
              reps: s.reps || 0,
              rir: s.rir || 0,
              completed: false,
            })),
          };
        });
      }
    }

    const workout = await db.workout.create({
      data: {
        userId,
        routineId: routineId || null,
        name: name || "Entrenamiento",
        exercises: exerciseData.length > 0
          ? {
              create: exerciseData.map((ex) => ({
                exerciseId: ex.exerciseId,
                order: ex.order,
                sets: {
                  create: ex.sets.map((set) => ({
                    type: set.type,
                    weight: set.weight,
                    reps: set.reps,
                    rir: set.rir,
                    completed: set.completed,
                  })),
                },
              })),
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
            sets: {
              orderBy: { id: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    console.error("Start workout error:", error);
    return NextResponse.json(
      { error: "Error al iniciar entrenamiento" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { exercises } = body;

    // Get active workout
    const activeWorkout = await db.workout.findFirst({
      where: {
        userId,
        completedAt: null,
      },
    });

    if (!activeWorkout) {
      return NextResponse.json(
        { error: "No hay entrenamiento activo" },
        { status: 404 }
      );
    }

    // Update sets for each exercise
    if (exercises && Array.isArray(exercises)) {
      for (const ex of exercises) {
        if (ex.sets && Array.isArray(ex.sets)) {
          for (const set of ex.sets) {
            if (set.id) {
              await db.workoutSet.update({
                where: { id: set.id },
                data: {
                  ...(set.weight !== undefined && { weight: set.weight }),
                  ...(set.reps !== undefined && { reps: set.reps }),
                  ...(set.rir !== undefined && { rir: set.rir }),
                  ...(set.completed !== undefined && { completed: set.completed }),
                  ...(set.type !== undefined && { type: set.type }),
                },
              });
            }
          }
        }

        // Add new sets if provided
        if (ex.newSets && Array.isArray(ex.newSets)) {
          // Find the workout exercise
          const workoutExercise = await db.workoutExercise.findFirst({
            where: {
              workoutId: activeWorkout.id,
              exerciseId: ex.exerciseId,
            },
          });

          if (workoutExercise) {
            await db.workoutSet.createMany({
              data: ex.newSets.map((set: { type: string; weight: number; reps: number; rir: number; completed: boolean }) => ({
                workoutExerciseId: workoutExercise.id,
                type: set.type || "normal",
                weight: set.weight || 0,
                reps: set.reps || 0,
                rir: set.rir || 0,
                completed: set.completed ?? false,
              })),
            });
          }
        }

        // Add new exercises to the workout if provided
        if (ex.addExercise && ex.exerciseId) {
          const existingEx = await db.workoutExercise.findFirst({
            where: {
              workoutId: activeWorkout.id,
              exerciseId: ex.exerciseId,
            },
          });

          if (!existingEx) {
            await db.workoutExercise.create({
              data: {
                workoutId: activeWorkout.id,
                exerciseId: ex.exerciseId,
                order: ex.order ?? 0,
                sets: ex.initialSets
                  ? {
                      create: ex.initialSets.map((set: { type: string; weight: number; reps: number; rir: number; completed: boolean }) => ({
                        type: set.type || "normal",
                        weight: set.weight || 0,
                        reps: set.reps || 0,
                        rir: set.rir || 0,
                        completed: set.completed ?? false,
                      })),
                    }
                  : undefined,
              },
            });
          }
        }
      }
    }

    // Fetch updated workout
    const updatedWorkout = await db.workout.findUnique({
      where: { id: activeWorkout.id },
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
    });

    return NextResponse.json(updatedWorkout);
  } catch (error) {
    console.error("Update active workout error:", error);
    return NextResponse.json(
      { error: "Error al actualizar entrenamiento" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get active workout
    const activeWorkout = await db.workout.findFirst({
      where: {
        userId,
        completedAt: null,
      },
    });

    if (!activeWorkout) {
      return NextResponse.json(
        { error: "No hay entrenamiento activo" },
        { status: 404 }
      );
    }

    await db.workout.delete({
      where: { id: activeWorkout.id },
    });

    return NextResponse.json({ message: "Entrenamiento cancelado" });
  } catch (error) {
    console.error("Cancel workout error:", error);
    return NextResponse.json(
      { error: "Error al cancelar entrenamiento" },
      { status: 500 }
    );
  }
}
