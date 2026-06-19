import { test, expect } from "@playwright/test";

test.describe("BII Agent Harness", () => {
  test("build output exists", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const mainOut = path.join(process.cwd(), "out", "main", "index.js");
    expect(fs.existsSync(mainOut)).toBe(true);
  });

  test("renderer index.html exists after build", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const rendererIndex = path.join(
      process.cwd(),
      "out",
      "renderer",
      "index.html",
    );
    expect(fs.existsSync(rendererIndex)).toBe(true);
  });
});
