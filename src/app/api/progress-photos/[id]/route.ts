import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";

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

    const progressPhoto = await db.progressPhoto.findUnique({
      where: { id },
    });

    if (!progressPhoto) {
      return NextResponse.json(
        { error: "Foto de progreso no encontrada" },
        { status: 404 }
      );
    }

    if (progressPhoto.userId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar esta foto" },
        { status: 403 }
      );
    }

    // Try to delete the file from disk
    try {
      const filePath = path.join(process.cwd(), "public", progressPhoto.photoUrl);
      await unlink(filePath);
    } catch {
      // File may not exist on disk, continue with DB deletion
    }

    await db.progressPhoto.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Foto de progreso eliminada" });
  } catch (error) {
    console.error("Delete progress photo error:", error);
    return NextResponse.json(
      { error: "Error al eliminar foto de progreso" },
      { status: 500 }
    );
  }
}
