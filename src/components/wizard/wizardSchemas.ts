import { z } from "zod";

// One zod schema per wizard step. `fieldErrors` turns a failed parse into
// { "questions.0.options.1": "Fill in this answer." }: the wizard shows each message under
// the input whose path it carries.

export type FieldErrors = Record<string, string>;

export function fieldErrors(result: {
  success: boolean;
  error?: z.ZodError;
}): FieldErrors {
  const out: FieldErrors = {};
  if (result.success || !result.error) return out;
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    out[key] ??= issue.message;
  }
  return out;
}

export const foundationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Campaign name must be at least 3 characters.")
      .max(80, "Campaign name must be 80 characters or fewer."),
    brandName: z
      .string()
      .trim()
      .min(2, "Brand name must be at least 2 characters.")
      .max(50, "Brand name must be 50 characters or fewer."),
    startDate: z.string().min(1, "Pick a start date and time."),
    endDate: z.string().min(1, "Pick an end date and time."),
  })
  .refine(
    (d) =>
      !d.startDate || !d.endDate || new Date(d.endDate) > new Date(d.startDate),
    { path: ["endDate"], message: "The end must be after the start." },
  );

export const skillSchema = z.object({
  targetScore: z
    .number("Enter a target score.")
    .int("The target score must be a whole number.")
    .min(1, "The target score must be at least 1."),
});

// The goal of a skill game, within what its engine can draw and the server accepts.
export const skillSchemaFor = (min: number, max: number) =>
  z.object({
    targetScore: z
      .number("Enter a target score.")
      .int("The target score must be a whole number.")
      .min(min, `The target score must be at least ${min}.`)
      .max(max, `The target score must be ${max} or fewer.`),
  });

export const quizSchema = z.object({
  questions: z.array(
    z.object({
      questionText: z.string().trim().min(1, "Write the question."),
      options: z
        .array(z.string().trim().min(1, "Fill in this answer."))
        .min(2, "Add at least 2 answers.")
        .max(4, "No more than 4 answers."),
    }),
  ),
});

// Sweepstake rules are only required to go live, not to save a draft.
export const drawSchema = (requireRules: boolean) =>
  z.object({
    draw: z.object({
      at: z
        .string()
        .min(1, "Pick the draw date and time.")
        .refine(
          (v) => new Date(v) > new Date(),
          "The draw must be in the future.",
        ),
      winners: z
        .number("Enter the number of winners.")
        .int("Winners must be a whole number.")
        .min(1, "Draw at least 1 winner."),
      rules: requireRules
        ? z
            .string()
            .trim()
            .min(1, "Sweepstake rules are required before going live.")
        : z.string(),
    }),
  });

export const SMS_MAX_LENGTH = 320;

export interface PrizesRules {
  stockOf: (templateId: string) => number | undefined;
  requireConsolation: boolean;
  // A draw: rewards and quantities are optional, the total cannot pass the number of winners,
  // and two SMS texts (winners, others) are written here.
  draw?: { winners: number; requireSms: boolean };
}

const smsText = (required: boolean, who: string) => {
  const base = z
    .string()
    .trim()
    .max(SMS_MAX_LENGTH, `Keep it under ${SMS_MAX_LENGTH} characters.`);
  return required
    ? base.min(1, `Write the message ${who} will receive before going live.`)
    : base;
};

export const prizesSchema = ({
  stockOf,
  requireConsolation,
  draw,
}: PrizesRules) => {
  const isDraw = Boolean(draw);
  const quantity = (message: string) =>
    z.number(message).int("Use a whole number.").min(1, "At least 1.");
  // In a draw a row may stay empty: no reward chosen, or no quantity.
  const drawQuantity = z
    .number("Use a whole number.")
    .int("Use a whole number.")
    .min(0, "The quantity cannot be negative.");

  const row = z
    .object({
      templateId: isDraw ? z.string() : z.string().min(1, "Select a reward."),
      quantity: isDraw ? drawQuantity : quantity("Enter a quantity."),
      weight: isDraw
        ? z.number().optional()
        : z
            .number("Enter a weight.")
            .min(0, "The weight cannot be negative.")
            .max(100, "The weight cannot exceed 100."),
    })
    .refine((p) => !p.templateId || stockOf(p.templateId) !== 0, {
      path: ["templateId"],
      message: "This reward is out of stock. Pick another one or restock it.",
    })
    .refine(
      (p) => {
        const stock = p.templateId ? stockOf(p.templateId) : undefined;
        return stock === undefined || stock === 0 || p.quantity <= stock;
      },
      {
        path: ["quantity"],
        message: "More than the stock available for this reward.",
      },
    )
    .refine(
      (p) => {
        const stock = p.templateId ? stockOf(p.templateId) : undefined;
        return (
          !draw || stock === undefined || stock === 0 || stock >= draw.winners
        );
      },
      {
        path: ["templateId"],
        message: `The stock of this reward is lower than the ${draw?.winners ?? 0} winners of the draw. Pick another reward or restock it.`,
      },
    );

  const prizes = z.array(row);
  const schema = {
    prizes: isDraw
      ? prizes.refine(
          (rows) => {
            const total = rows.reduce(
              (sum, p) => sum + (p.templateId ? p.quantity : 0),
              0,
            );
            return total <= (draw?.winners ?? Infinity);
          },
          {
            message: `The total quantity cannot be more than the ${draw?.winners ?? 0} winner${draw?.winners === 1 ? "" : "s"} of the draw.`,
          },
        )
      : prizes
          .min(1, "Add at least one reward.")
          .refine(
            (rows) => rows.reduce((sum, p) => sum + (p.weight ?? 0), 0) > 0,
            { message: "At least one reward needs a weight above 0." },
          ),
    consolationPrizes: z
      .array(
        z
          .object({
            templateId: z.string().min(1, "Select a reward."),
            quantity: quantity("Enter a quantity."),
          })
          .refine((p) => !p.templateId || stockOf(p.templateId) !== 0, {
            path: ["templateId"],
            message:
              "This reward is out of stock. Pick another one or restock it.",
          }),
      )
      .min(requireConsolation ? 1 : 0, "Add at least one consolation prize."),
  };
  return z.object({
    ...schema,
    sms: z.object({
      winner: smsText(Boolean(draw?.requireSms), "the winners"),
      loser: smsText(Boolean(draw?.requireSms), "the other players"),
    }),
  });
};
