// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import type { OrgMember } from "@/features/auth/lib/auth-api";

vi.mock("@tauri-apps/api/core", () => ({ convertFileSrc: (p: string) => p }));

const { ActiveNow, shortName } = await import("./online-teammates");

function member(userId: string, name: string, email = `${userId}@acme.dev`): OrgMember {
  return {
    id: `mem_${userId}`,
    userId,
    name,
    email,
    role: "developer",
    createdAt: null,
    avatarPath: null,
    isOwner: false,
  };
}

afterEach(cleanup);

describe("shortName", () => {
  it("is the first word of the name, else the email's local part", () => {
    expect(shortName(member("u1", "Ada Lovelace"))).toBe("Ada");
    expect(shortName(member("u2", "  Grace  Hopper "))).toBe("Grace");
    expect(shortName(member("u3", "", "linus@kernel.org"))).toBe("linus");
  });
});

describe("ActiveNow", () => {
  it("renders nothing when nobody else is online", () => {
    const { container } = render(<ActiveNow members={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows every face with its first name — no '+N' fold", () => {
    const people = ["Ada A", "Grace B", "Linus C", "Barbara D", "Ken E", "Dennis F"].map((n, i) =>
      member(`u${i}`, n),
    );
    render(<ActiveNow members={people} />);
    const strip = screen.getByRole("region", { name: "Ada A, Grace B and 4 others are online" });
    expect(within(strip).getByText("Active now")).toBeTruthy();
    expect(within(strip).getAllByRole("listitem")).toHaveLength(6);
    expect(within(strip).getByText("Dennis")).toBeTruthy();
    expect(strip.textContent).not.toMatch(/\+\d/);
  });
});
