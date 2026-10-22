// @vitest-environment happy-dom
//
// The trusted preview loads its images through Rust: the CSP refuses remote
// ones and relative ones resolve against the app, not the document. These
// pin which images take that path and what an unloadable one leaves behind.

import { afterEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() =>
  vi.fn(async (_cmd: string, args: { src: string }) => {
    if (args.src.includes("missing")) throw new Error("404");
    return `data:image/png;base64,${btoa(args.src)}`;
  }),
);
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { cleanup, render, waitFor } from "@testing-library/react";
import { MarkdownFile } from "./markdown-fileviewer";

afterEach(() => {
  cleanup();
  invoke.mockClear();
});

const DOC = "/repo/docs/README.md";
const srcs = (root: HTMLElement) =>
  [...root.querySelectorAll("img")].map((i) => i.getAttribute("src"));

describe("markdown preview images", () => {
  it("loads remote and relative images, raw HTML included, through Rust", async () => {
    const md = [
      "![badge](https://img.shields.io/badge/a-b-blue)",
      "",
      '<img src="shot.png" alt="Shot" width="900" />',
    ].join("\n");
    const { container } = render(
      <MarkdownFile trusted docPath={DOC}>
        {md}
      </MarkdownFile>,
    );

    await waitFor(() =>
      expect(srcs(container)).toEqual([
        `data:image/png;base64,${btoa("https://img.shields.io/badge/a-b-blue")}`,
        `data:image/png;base64,${btoa("shot.png")}`,
      ]),
    );
    expect(invoke).toHaveBeenCalledWith("markdown_preview_image", {
      docPath: DOC,
      src: "shot.png",
    });
    // The raw-HTML size survives, so the layout holds while it loads.
    expect(container.querySelectorAll("img")[1].getAttribute("width")).toBe("900");
  });

  it("leaves an untrusted document's images to the webview", () => {
    const { container } = render(<MarkdownFile>{"![r](https://example.com/x.png)"}</MarkdownFile>);

    expect(srcs(container)).toEqual(["https://example.com/x.png"]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("shows the alt text for an image it cannot load", async () => {
    const { container, findByText } = render(
      <MarkdownFile trusted docPath={DOC}>
        {"![Architecture diagram](missing.png)"}
      </MarkdownFile>,
    );

    await findByText("Architecture diagram");
    expect(container.querySelector("img")).toBeNull();
  });
});
