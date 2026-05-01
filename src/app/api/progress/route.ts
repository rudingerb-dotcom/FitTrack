import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // exercise | routine
    const id = searchParams.get("id"); // exerciseId | routineId

    if (!type || !id) {
      return NextResponse.json(
        { error: "Parámetros type e id son requeridos" },
        { status: 400 }
      );
    }

    if (type === "exercise") {
      // Get weight progression for a specific exercise over time
      const workouts = await db.workout.findMany({
        where: {
          userId,
          completedAt: { not: null },
          exercises: {
            some: {
              exerciseId: id,
            },
          },
        },
        include: {
          exercises: {
            where: { exerciseId: id },
            include: {
              sets: true,
            },
          },
        },
        orderBy: { completedAt: "asc" },
      });

      // Verify exercise belongs to user
      const exercise = await db.exercise.findUnique({
        where: { id },
      });

      if (!exercise || exercise.userId !== userId) {
        return NextResponse.json(
          { error: "Ejercicio no encontrado" },
          { status: 404 }
        );
      }

      const progressData = workouts.map((workout) => {
        const workoutEx = workout.exercises[0];
        const sets = workoutEx?.sets || [];
        const maxWeight = sets.length > 0
          ? Math.max(...sets.map((s) => s.weight))
          : 0;
        const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        const maxReps = sets.length > 0
          ? Math.max(...sets.map((s) => s.reps))
          : 0;

        return {
          date: workout.completedAt,
          workoutId: workout.id,
          workoutName: workout.name,
          maxWeight,
          totalVolume,
          maxReps,
          sets: sets.map((s) => ({
            type: s.type,
            weight: s.weight,
            reps: s.reps,
            rir: s.rir,
            completed: s.completed,
          })),
        };
      });

      return NextResponse.json({
        exercise: {
          id: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
        },
        progress: progressData,
      });
    }

    if (type === "routine") {
      // Get volume by routine over time
      const workouts = await db.workout.findMany({
        where: {
          userId,
          routineId: id,
          completedAt: { not: null },
        },
        include: {
          exercises: {
            include: {
              exercise: true,
              sets: true,
            },
          },
        },
        orderBy: { completedAt: "asc" },
      });

      // Verify routine belongs to user
      const routine = await db.routine.findUnique({
        where: { id },
      });

      if (!routine || routine.userId !== userId) {
        return NextResponse.json(
          { error: "Rutina no encontrada" },
          { status: 404 }
        );
      }

      const progressData = workouts.map((workout) => {
        const totalVolume = workout.exercises.reduce(
          (sum, ex) => sum + ex.sets.reduce((sSum, s) => sSum + s.weight * s.reps, 0),
          0
        );
        const totalSets = workout.exercises.reduce(
          (sum, ex) => sum + ex.sets.length,
          0
        );
        const duration = workout.duration;

        return {
          date: workout.completedAt,
          workoutId: workout.id,
          workoutName: workout.name,
          totalVolume,
          totalSets,
          duration,
          exerciseBreakdown: workout.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exercise.name,
            volume: ex.sets.reduce((s, set) => s + set.weight * set.reps, 0),
            sets: ex.sets.length,
          })),
        };
      });

      return NextResponse.json({
        routine: {
          id: routine.id,
          name: routine.name,
        },
        progress: progressData,
      });
    }

    return NextResponse.json(
      { error: "Tipo inválido. Usa 'exercise' o 'routine'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json(
      { error: "Error al obtener progreso" },
      { status: 500 }
    );
  }
}
