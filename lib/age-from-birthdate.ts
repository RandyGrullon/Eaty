export function formatDateOnlyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODateLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const birth = new Date(y, month - 1, day);
  if (
    birth.getFullYear() !== y ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day
  ) {
    return null;
  }
  return birth;
}

export function calculateAgeFromBirthDateString(iso: string): number | null {
  const birth = parseISODateLocal(iso);
  if (!birth) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function getProfileDisplayAge(profile: {
  birthDate?: string;
  age?: number;
}): number | undefined {
  if (profile.birthDate) {
    const a = calculateAgeFromBirthDateString(profile.birthDate);
    if (a !== null && a >= 0) return a;
  }
  return profile.age;
}

export function normalizeBirthDateFromFirestore(
  value: unknown
): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    const d = (value as { toDate: () => Date }).toDate();
    return formatDateOnlyLocal(d);
  }
  return undefined;
}
