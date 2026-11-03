import { describe, expect, it } from "vitest";
import { fieldErrors, prizesSchema } from "./wizardSchemas";

const stockOf = () => 100;
const sms = { winner: "You won", loser: "Not this time" };

const check = (
  prizes: { templateId: string; quantity: number; weight: number }[],
  draw?: { winners: number; requireSms: boolean },
  smsTexts = sms,
) =>
  fieldErrors(
    prizesSchema({ stockOf, requireConsolation: false, draw }).safeParse({
      prizes,
      consolationPrizes: [],
      sms: smsTexts,
    }),
  );

describe("prizesSchema for a draw", () => {
  const draw = { winners: 6, requireSms: true };

  it("accepts no reward at all", () => {
    expect(check([], draw)).toEqual({});
    expect(check([{ templateId: "", quantity: 0, weight: 100 }], draw)).toEqual(
      {},
    );
  });

  it("accepts a reward without quantity", () => {
    expect(
      check([{ templateId: "a", quantity: 0, weight: 100 }], draw),
    ).toEqual({});
  });

  it("refuses a total above the number of winners", () => {
    const errors = check(
      [
        { templateId: "a", quantity: 4, weight: 100 },
        { templateId: "b", quantity: 3, weight: 100 },
      ],
      draw,
    );
    expect(errors.prizes).toMatch(/6 winners/);
  });

  it("accepts a total equal to the number of winners", () => {
    expect(
      check(
        [
          { templateId: "a", quantity: 4, weight: 100 },
          { templateId: "b", quantity: 2, weight: 100 },
        ],
        draw,
      ),
    ).toEqual({});
  });

  it("requires both SMS texts to go live only", () => {
    const empty = { winner: "", loser: "" };
    expect(check([], draw, empty)).toMatchObject({
      "sms.winner": expect.any(String),
      "sms.loser": expect.any(String),
    });
    expect(check([], { winners: 6, requireSms: false }, empty)).toEqual({});
  });
});

describe("prizesSchema for an instant win", () => {
  it("still needs one reward with a quantity", () => {
    expect(check([]).prizes).toBeDefined();
    expect(
      check([{ templateId: "a", quantity: 0, weight: 100 }])[
        "prizes.0.quantity"
      ],
    ).toBeDefined();
  });
});
