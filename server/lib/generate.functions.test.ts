import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRepoMetadata } from "./generate.functions";

describe("fetchRepoMetadata", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("fetches repository metadata and a bounded decoded README from GitHub's API contract", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        name: "next.js",
        description: "The React Framework for the Web",
        language: "TypeScript",
        license: { name: "MIT License" },
        topics: ["react", "nextjs"],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        content: Buffer.from("# Next.js\nA framework", "utf8").toString("base64"),
      }), { status: 200 }));

    await expect(fetchRepoMetadata("https://github.com/vercel/next.js")).resolves.toEqual({
      name: "next.js",
      description: "The React Framework for the Web",
      language: "TypeScript",
      license: "MIT License",
      topics: ["react", "nextjs"],
      readme: "# Next.js\nA framework",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.github.com/repos/vercel/next.js");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.github.com/repos/vercel/next.js/readme");
  });

  it("rejects invalid repository URL shapes before issuing an outbound request", async () => {
    await expect(fetchRepoMetadata("https://github.com/invalid-url-format")).rejects.toThrow("Invalid GitHub repository URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a GitHub 404 to the public-repository guidance message", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Not found", { status: 404, statusText: "Not Found" }));
    await expect(fetchRepoMetadata("https://github.com/nonexistent-user/nonexistent-repo")).rejects.toThrow("Repository not found");
  });
});
