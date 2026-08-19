import { describe, it, expect, vi } from "vitest";
import { fetchRepoMetadata } from "./generate.functions";

describe("fetchRepoMetadata", () => {
  it("should fetch valid repository metadata from GitHub", async () => {
    // Test with a real public repository
    const repoUrl = "https://github.com/vercel/next.js";

    const metadata = await fetchRepoMetadata(repoUrl);

    expect(metadata).toBeDefined();
    expect(metadata.name).toBe("next.js");
    expect(metadata.description).toBeDefined();
    expect(typeof metadata.description).toBe("string");
  }, 15_000);

  it("should throw error for invalid repository URL", async () => {
    const invalidUrl = "https://github.com/invalid-url-format";

    await expect(fetchRepoMetadata(invalidUrl)).rejects.toThrow();
  });

  it("should throw error for non-existent repository", async () => {
    const nonExistentUrl = "https://github.com/nonexistent-user-12345/nonexistent-repo-98765";

    await expect(fetchRepoMetadata(nonExistentUrl)).rejects.toThrow(
      "Repository not found"
    );
  });
});
