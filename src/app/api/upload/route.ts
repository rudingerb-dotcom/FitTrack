import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // physique | progress

    if (!file) {
      return NextResponse.json(
        { error: "Archivo requerido" },
        { status: 400 }
      );
    }

    if (!type || !["physique", "progress"].includes(type)) {
      return NextResponse.json(
        { error: "Tipo requerido: 'physique' o 'progress'" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Solo se permiten imágenes (JPEG, PNG, WebP, GIF)" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo no puede superar 5MB" },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "public", "uploads", type);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const fileExtension = file.name.split(".").pop() || "jpg";
    const uniqueFilename = `${userId}-${uuidv4()}.${fileExtension}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return URL path
    const urlPath = `/uploads/${type}/${uniqueFilename}`;

    return NextResponse.json({ url: urlPath }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error al subir archivo" },
      { status: 500 }
    );
  }
}
