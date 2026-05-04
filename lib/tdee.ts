export function calculateTDEEPrecise(userProfile: {
  age: number;
  gender: "male" | "female" | "other";
  weight: number;
  height: number;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  fitnessGoal: "bulking" | "shedding" | "maintenance";
}): {
  bmr: number;
  tdee: number;
  dailyCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  explanation: string;
} {
  let bmr: number;
  if (userProfile.gender === "male") {
    bmr =
      10 * userProfile.weight +
      6.25 * userProfile.height -
      5 * userProfile.age +
      5;
  } else if (userProfile.gender === "female") {
    bmr =
      10 * userProfile.weight +
      6.25 * userProfile.height -
      5 * userProfile.age -
      161;
  } else {
    bmr =
      10 * userProfile.weight +
      6.25 * userProfile.height -
      5 * userProfile.age -
      78;
  }

  const activityFactors = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const tdee = Math.round(bmr * activityFactors[userProfile.activityLevel]);
  const bmrRounded = Math.round(bmr);

  let dailyCalories: number;
  let explanation: string;

  switch (userProfile.fitnessGoal) {
    case "maintenance":
      dailyCalories = tdee;
      explanation = `Tu TDEE es de ${tdee} calorías diarias para mantener tu peso actual. Este cálculo se basa en tu metabolismo basal de ${bmrRounded} calorías y tu nivel de actividad.`;
      break;

    case "bulking":
      dailyCalories = tdee + 400;
      explanation = `Para ganar masa muscular, necesitas ${dailyCalories} calorías diarias (TDEE ${tdee} + 400 calorías de superávit). Este superávit moderado te permitirá ganar ~0.25-0.5kg de músculo por mes con entrenamiento adecuado.`;
      break;

    case "shedding":
      dailyCalories = tdee - 500;
      explanation = `Para perder grasa corporal, necesitas ${dailyCalories} calorías diarias (TDEE ${tdee} - 500 calorías de déficit). Este déficit te permitirá perder ~0.5kg de grasa por semana de forma sostenible.`;
      break;

    default:
      dailyCalories = tdee;
      explanation = `Cálculo estándar de mantenimiento: ${tdee} calorías diarias.`;
  }

  let macros: { protein: number; carbs: number; fat: number };

  switch (userProfile.fitnessGoal) {
    case "maintenance":
      macros = {
        protein: Math.round(userProfile.weight * 2.0),
        carbs: Math.round((dailyCalories * 0.45) / 4),
        fat: Math.round((dailyCalories * 0.25) / 9),
      };
      break;

    case "bulking":
      macros = {
        protein: Math.round(userProfile.weight * 2.2),
        carbs: Math.round((dailyCalories * 0.55) / 4),
        fat: Math.round((dailyCalories * 0.225) / 9),
      };
      break;

    case "shedding":
      macros = {
        protein: Math.round(userProfile.weight * 2.5),
        carbs: Math.round((dailyCalories * 0.35) / 4),
        fat: Math.round((dailyCalories * 0.3) / 9),
      };
      break;

    default:
      macros = {
        protein: Math.round(userProfile.weight * 2.0),
        carbs: Math.round((dailyCalories * 0.45) / 4),
        fat: Math.round((dailyCalories * 0.25) / 9),
      };
  }

  return {
    bmr: bmrRounded,
    tdee,
    dailyCalories,
    macros,
    explanation,
  };
}
