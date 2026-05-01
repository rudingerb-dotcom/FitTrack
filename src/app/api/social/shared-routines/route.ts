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

    // Get pending shared routines received by the user
    const sharedRoutines = await db.routineShare.findMany({
      where: {
        receiverId: userId,
        status: "pending",
      },
      include: {
        routine: {
          include: {
            exercises: {
              include: {
                exercise: true,
              },
              orderBy: { order: "asc" },
            },
          },
        },
        sender: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Parse setsConfig for response
    const sharedRoutinesParsed = sharedRoutines.map((share) => ({
      ...share,
      routine: {
        ...share.routine,
        exercises: share.routine.exercises.map((re) => ({
          ...re,
          setsConfig: JSON.parse(re.setsConfig),
        })),
      },
    }));

    return NextResponse.json(sharedRoutinesParsed);
  } catch (error) {
    console.error("Get shared routines error:", error);
    return NextResponse.json(
      { error: "Error al obtener rutinas compartidas" },
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
    const { shareId } = body;

    if (!shareId) {
      return NextResponse.json(
        { error: "shareId es requerido" },
        { status: 400 }
      );
    }

    // Check if share exists and belongs to user
    const share = await db.routineShare.findUnique({
      where: { id: shareId },
      include: {
        routine: {
          include: {
            exercises: {
              include: {
                exercise: true,
              },
            },
          },
        },
      },
    });

    if (!share) {
      return NextResponse.json(
        { error: "Rutina compartida no encontrada" },
        { status: 404 }
      );
    }

    if (share.receiverId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para aceptar esta rutina" },
        { status: 403 }
      );
    }

    if (share.status !== "pending") {
      return NextResponse.json(
        { error: "Esta rutina ya ha sido procesada" },
        { status: 400 }
      );
    }

    // Accept the share
    await db.routineShare.update({
      where: { id: shareId },
      data: { status: "accepted" },
    });

    // Clone the routine for the receiving user
    const originalRoutine = share.routine;
    const newRoutine = await db.routine.create({
      data: {
        name: originalRoutine.name,
        description: originalRoutine.description,
        userId,
        exercises: {
          create: originalRoutine.exercises.map((re) => {
            // Check if the user has an exercise with the same name
            return {
              exerciseId: re.exerciseId, // Will be updated below
              order: re.order,
              setsConfig: re.setsConfig,
            };
          }),
        },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    // For each exercise in the shared routine, find or create matching exercise for the user
    for (const re of originalRoutine.exercises) {
      const exerciseName = re.exercise.name;
      // Find if user already has this exercise
      let userExercise = await db.exercise.findFirst({
        where: {
          userId,
          name: exerciseName,
        },
      });

      if (!userExercise) {
        // Create the exercise for the user
        userExercise = await db.exercise.create({
          data: {
            userId,
            name: re.exercise.name,
            muscleGroup: re.exercise.muscleGroup,
            secondaryMuscle: re.exercise.secondaryMuscle,
            tertiaryMuscle: re.exercise.tertiaryMuscle,
            equipment: re.exercise.equipment,
            isDefault: false,
          },
        });
      }

      // Update the routine exercise to point to the user's exercise
      const newRoutineExercise = newRoutine.exercises.find(
        (nre) => nre.order === re.order
      );

      if (newRoutineExercise) {
        await db.routineExercise.update({
          where: { id: newRoutineExercise.id },
          data: { exerciseId: userExercise.id },
        });
      }
    }

    // Fetch the final routine with correct exercises
    const finalRoutine = await db.routine.findUnique({
      where: { id: newRoutine.id },
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
      ...finalRoutine,
      exercises: finalRoutine?.exercises.map((re) => ({
        ...re,
        setsConfig: JSON.parse(re.setsConfig),
      })),
    };

    return NextResponse.json({
      message: "Rutina aceptada y añadida a tus rutinas",
      routine: routineWithParsedConfig,
    });
  } catch (error) {
    console.error("Accept shared routine error:", error);
    return NextResponse.json(
      { error: "Error al aceptar rutina compartida" },
      { status: 500 }
    );
  }
}
