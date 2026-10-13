/**
 * Who else is here — the Timeline's "Active now" strip: a row of round faces,
 * each with the online dot and a first name under it, the way a messenger
 * shows who is around. It sits at the top of the Timeline column, above the
 * first day, because it answers the question the list raises — whose work is
 * this, and who can I ask about it right now.
 *
 * It replaced a 16px facepile beside the header's "Timeline" label, which
 * capped at four faces and folded the rest into a "+3" nobody could read.
 */

import { memo } from "react";

import { AccountAvatar } from "@/features/auth/components/account-avatar";
import type { OrgMember } from "@/features/auth/lib/auth-api";
import { cn } from "@/lib/utils";
import { Hint } from "@/ui/tooltip";

import { avatarUser } from "./comment-thread";

/** The face, and the dot cut into its corner. */
const FACE_PX = 32;
const DOT_PX = 9;

/**
 * The green dot, ringed in the surface it sits on so it reads as cut out of
 * the photo. Sized by the caller: a 10px byline face and a 16px stack face
 * want different dots.
 */
export function OnlineDot({ px, className }: { px: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: px, height: px }}
      className={cn(
        "absolute -bottom-px -right-px rounded-full bg-[var(--atlas-status-success-foreground)] ring-1 ring-[var(--background)]",
        className,
      )}
    />
  );
}

/** "Ada, Grace and 3 others are online" — the stack's accessible name. */
export function onlineLabel(members: OrgMember[]): string {
  const names = members.map((m) => m.name || m.email);
  if (names.length === 0) return "Nobody else is online";
  if (names.length === 1) return `${names[0]} is online`;
  if (names.length <= 3) {
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are online`;
  }
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} others are online`;
}

/** The name under a face: the first word of the display name, else the
 *  email's local part. "Aham…" is still a person; "aham@atlas.dev" is a
 *  column of text. */
export function shortName(m: OrgMember): string {
  const name = m.name?.trim();
  if (name) return name.split(/\s+/)[0]!;
  return m.email.split("@")[0] ?? m.email;
}

export const ActiveNow = memo(function ActiveNow({ members }: { members: OrgMember[] }) {
  if (members.length === 0) return null;
  return (
    <section aria-label={onlineLabel(members)} className="shrink-0 pt-2.5 pb-1.5">
      <h3 className="px-3 caption">Active now</h3>
      {/* Every face, scrolled sideways past the column's width — no "+N":
          a count is the one thing a row of faces exists to replace. */}
      <ul className="hide-scrollbar mt-2 flex gap-1 overflow-x-auto px-2">
        {members.map((m) => {
          const full = m.name || m.email;
          return (
            <li key={m.userId} className="shrink-0">
              <Hint label={m.name && m.email ? `${m.name} · ${m.email}` : full} side="bottom">
                <span
                  tabIndex={0}
                  aria-label={full}
                  className="flex w-12 flex-col items-center gap-1 rounded-md py-0.5 outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]"
                >
                  <span className="relative inline-flex rounded-full">
                    <AccountAvatar user={avatarUser(m)} size={FACE_PX} />
                    <OnlineDot px={DOT_PX} className="ring-2" />
                  </span>
                  <span className="w-full truncate text-center text-2xs text-secondary-foreground">
                    {shortName(m)}
                  </span>
                </span>
              </Hint>
            </li>
          );
        })}
      </ul>
    </section>
  );
});
