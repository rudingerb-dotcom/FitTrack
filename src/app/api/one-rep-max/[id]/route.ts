import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

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

    const oneRepMax = await db.oneRepMax.findUnique({
      where: { id },
    });

    if (!oneRepMax) {
      return NextResponse.json(
        { error: "Registro 1RM no encontrado" },
        { status: 404 }
      );
    }

    if (oneRepMax.userId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar este registro" },
        { status: 403 }
      );
    }

    await db.oneRepMax.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Registro 1RM eliminado" });
  } catch (error) {
    console.error("Delete 1RM error:", error);
    return NextResponse.json(
      { error: "Error al eliminar registro 1RM" },
      { status: 500 }
    );
  }
}
