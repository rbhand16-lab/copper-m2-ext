import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("@/lib/copper/catalog");
  vi.resetModules();
});

async function loadTools() {
  vi.resetModules();
  return import("@/lib/copper/assistant/tools");
}

describe("compare_plans", () => {
  it("says yearly is cheaper over 1 year: $95.88 monthly vs $79 yearly", async () => {
    const { comparePlans } = await loadTools();
    expect(comparePlans({ years: 1 })).toEqual({
      years: 1,
      monthlyTotalUsd: 95.88,
      annualTotalUsd: 79,
      cheaper: "annual",
      savingsUsd: 16.88,
    });
  });

  it("scales with the number of years", async () => {
    const { comparePlans } = await loadTools();
    expect(comparePlans({ years: 3 })).toMatchObject({
      monthlyTotalUsd: 287.64,
      annualTotalUsd: 237,
      savingsUsd: 50.64,
    });
  });

  it("follows the catalog when prices change", async () => {
    vi.doMock("@/lib/copper/catalog", async (importOriginal) => {
      const real =
        await importOriginal<typeof import("@/lib/copper/catalog")>();
      return {
        ...real,
        getPlans: () =>
          real
            .getPlans()
            .map((p) =>
              p.id === "copper-plus"
                ? { ...p, monthlyUsd: 5, annualUsd: 90 }
                : p,
            ),
      };
    });
    const { comparePlans } = await loadTools();
    // $5 x 12 = $60 a year, so monthly is now cheaper than $90 yearly.
    expect(comparePlans({ years: 1 })).toMatchObject({
      monthlyTotalUsd: 60,
      annualTotalUsd: 90,
      cheaper: "monthly",
      savingsUsd: 30,
    });
  });

  it("rejects years outside 1 to 5", async () => {
    const { comparePlansInput } = await loadTools();
    expect(comparePlansInput.safeParse({ years: 3 }).success).toBe(true);
    for (const years of [0, 6, 1.5, "2"])
      expect(comparePlansInput.safeParse({ years }).success).toBe(false);
  });

  it("is one of the tools Copper can use", async () => {
    const { copperTools } = await loadTools();
    expect(copperTools.compare_plans.description).toMatch(/monthly.*yearly/i);
  });
});
