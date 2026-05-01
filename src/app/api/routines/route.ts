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

    const routines = await db.routine.findMany({
      where: { userId },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Parse setsConfig from JSON string for each routine exercise
    const routinesWithParsedConfig = routines.map((routine) => ({
      ...routine,
      exercises: routine.exercises.map((re) => ({
        ...re,
        setsConfig: JSON.parse(re.setsConfig),
      })),
    }));

    return NextResponse.json(routinesWithParsedConfig);
  } catch (error) {
    console.error("Get routines error:", error);
    return NextResponse.json(
      { error: "Error al obtener rutinas" },
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
    const { name, description, exercises } = body;

    if (!name) {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const routine = await db.routine.create({
      data: {
        name,
        description: description || null,
        userId,
        exercises: exercises
          ? {
              create: exercises.map(
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
                  exerciseId: ex.exerciseId,
                  order: ex.order ?? 0,
                  setsConfig: JSON.stringify(ex.setsConfig || []),
                })
              ),
            }
          : undefined,
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

    // Parse setsConfig for response
    const routineWithParsedConfig = {
      ...routine,
      exercises: routine.exercises.map((re) => ({
        ...re,
        setsConfig: JSON.parse(re.setsConfig),
      })),
    };

    return NextResponse.json(routineWithParsedConfig, { status: 201 });
  } catch (error) {
    console.error("Create routine error:", error);
    return NextResponse.json(
      { error: "Error al crear rutina" },
      { status: 500 }
    );
  }
}
