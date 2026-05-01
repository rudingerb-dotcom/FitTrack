import { db } from "@/lib/db";

interface DefaultExerciseInput {
  name: string;
  muscleGroup: string;
  secondaryMuscle?: string;
  tertiaryMuscle?: string;
  equipment?: string;
}

const defaultExercises: DefaultExerciseInput[] = [
  { name: "Press Banca", muscleGroup: "Pecho", equipment: "Barra" },
  { name: "Press Militar", muscleGroup: "Hombros", equipment: "Barra" },
  { name: "Dominadas", muscleGroup: "Dorsales", secondaryMuscle: "Bíceps", tertiaryMuscle: "Antebrazos", equipment: "Peso corporal" },
  { name: "Sentadilla", muscleGroup: "Cuádriceps", secondaryMuscle: "Glúteos", tertiaryMuscle: "Lumbares", equipment: "Barra" },
  { name: "Peso Muerto", muscleGroup: "Lumbares", secondaryMuscle: "Isquiotibiales", tertiaryMuscle: "Trapecio", equipment: "Barra" },
  { name: "Remo con Barra", muscleGroup: "Dorsales", secondaryMuscle: "Bíceps", tertiaryMuscle: "Lumbares", equipment: "Barra" },
  { name: "Curl Bíceps", muscleGroup: "Bíceps", equipment: "Mancuernas" },
  { name: "Extensión Tríceps", muscleGroup: "Tríceps", equipment: "Polea" },
  { name: "Elevaciones Laterales", muscleGroup: "Hombros", equipment: "Mancuernas" },
  { name: "Face Pull", muscleGroup: "Trapecio", secondaryMuscle: "Deltoides Posterior", equipment: "Polea" },
  { name: "Zancadas", muscleGroup: "Cuádriceps", secondaryMuscle: "Glúteos", equipment: "Mancuernas" },
  { name: "Prensa", muscleGroup: "Cuádriceps", secondaryMuscle: "Gemelos", equipment: "Máquina" },
  { name: "Curl Femoral", muscleGroup: "Isquiotibiales", equipment: "Máquina" },
  { name: "Elevación de Gemelos", muscleGroup: "Gemelos", equipment: "Máquina" },
  { name: "Aperturas con Mancuernas", muscleGroup: "Pecho", secondaryMuscle: "Deltoides Anterior", equipment: "Mancuernas" },
  { name: "Hip Thrust", muscleGroup: "Glúteos", secondaryMuscle: "Isquiotibiales", equipment: "Barra" },
  { name: "Abductores en Máquina", muscleGroup: "Abductores", equipment: "Máquina" },
  { name: "Aductores en Máquina", muscleGroup: "Aductores", equipment: "Máquina" },
  { name: "Encogimientos", muscleGroup: "Trapecio", equipment: "Mancuernas" },
  { name: "Hiperextensiones", muscleGroup: "Lumbares", secondaryMuscle: "Glúteos", equipment: "Banco romano" },
];

export async function createDefaultExercises(userId: string) {
  await db.exercise.createMany({
    data: defaultExercises.map((exercise) => ({
      ...exercise,
      userId,
      isDefault: true,
    })),
  });
}
