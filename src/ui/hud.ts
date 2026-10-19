/**
 * The frosted-HUD recipe: the hint overlay's keycaps (⌘⌥Space) and anything
 * that should read the way they do — the overview's count badges.
 * `glass-hud` (globals.css) carries the border, raised edge and shadow; the
 * blur and the translucent fill stay here because the alpha is what lets the
 * blur through and a smaller chip may want a lighter one.
 */
export const HUD = "glass-hud backdrop-blur-glass bg-gradient-to-b from-popover/85 to-card/90";
