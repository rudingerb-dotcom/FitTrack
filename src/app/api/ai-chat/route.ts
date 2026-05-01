import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import OpenAI from "openai";

const SYSTEM_PROMPT = `Eres un entrenador personal experto y nutricionista deportivo llamado FitTrack AI Coach. Tu objetivo es ayudar a los usuarios con:

1. **Rutinas de entrenamiento**: Diseñar, modificar y optimizar rutinas según objetivos, nivel y disponibilidad.
2. **Técnica y forma**: Corregir y explicar la técnica correcta de ejercicios para prevenir lesiones.
3. **Nutrición**: Asesorar sobre macros, suplementación y estrategias nutricionales para diferentes objetivos.
4. **Recuperación**: Recomendar estrategias de recuperación, estiramientos y prevención de lesiones.
5. **Progresión**: Sugerir cómo progresar en cargas, volúmenes e intensidades.

Reglas importantes:
- Solo genera JSON de rutinas cuando el usuario te pida explícitamente crear o modificar una rutina.
- Responde en el mismo idioma que el usuario.
- Sé práctico y directo en tus respuestas.
- Cuando generes una rutina en JSON, usa este formato:
{
  "name": "Nombre de la rutina",
  "description": "Descripción",
  "exercises": [
    {
      "exerciseName": "Nombre del ejercicio",
      "muscleGroup": "Grupo muscular",
      "sets": [
        {"type": "normal", "weight": 0, "reps": 8, "rir": 2}
      ],
      "order": 1
    }
  ]
}
- Siempre prioriza la seguridad y la técnica correcta.
- Recomienda progresiones graduales.`;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Check user plan
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (user.plan === "free") {
      return NextResponse.json(
        {
          error: "El acceso al AI Coach requiere un plan Pro",
          message: "Actualiza tu plan para acceder al entrenador AI",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { message, conversationId } = body;

    if (!message) {
      return NextResponse.json(
        { error: "El mensaje es requerido" },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await db.aIConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!conversation || conversation.userId !== userId) {
        return NextResponse.json(
          { error: "Conversación no encontrada" },
          { status: 404 }
        );
      }
    } else {
      // Create new conversation
      const title = message.length > 50 ? message.substring(0, 50) + "..." : message;
      conversation = await db.aIConversation.create({
        data: {
          userId,
          title,
          messages: {
            create: [],
          },
        },
        include: {
          messages: true,
        },
      });
    }

    // Save user message
    await db.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // Build messages for OpenAI
    const chatMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...conversation.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Call OpenAI API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Servicio de AI no configurado" },
        { status: 503 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      max_tokens: 2000,
      temperature: 0.7,
    });

    const assistantMessage = completion.choices[0]?.message?.content || "Lo siento, no pude generar una respuesta.";

    // Save assistant message
    await db.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantMessage,
      },
    });

    // Update conversation title if it's a new conversation
    if (!conversationId && conversation.messages.length === 0) {
      await db.aIConversation.update({
        where: { id: conversation.id },
        data: { title: message.length > 50 ? message.substring(0, 50) + "..." : message },
      });
    }

    return NextResponse.json({
      conversationId: conversation.id,
      message: assistantMessage,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Error al procesar mensaje" },
      { status: 500 }
    );
  }
}
