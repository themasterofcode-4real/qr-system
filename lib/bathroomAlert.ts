let bathroomCount = 0;

export function checkBathroomAlert(
  destination: string
): {
  triggered: boolean;
  title?: string;
  message?: string;
  tts?: string;
} {
  if (destination !== "BATHROOM") {
    return { triggered: false };
  }

  bathroomCount++;

  if (bathroomCount >= 3) {
    bathroomCount = 0;

    return {
      triggered: true,
      title: "BATHROOM LIMIT EXCEEDED",
      message: "YOU WENT TO THE BATHROOM TOO MUCH. EMAIL SENT TO JOEY. SKID MARKS DETECTED.",
      tts: "YOU WENT TO THE BATHROOM TOO MUCH. EMAIL SENT TO JOEY. SKID MARKS DETECTED.",
    };
  }

  return { triggered: false };
}