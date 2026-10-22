/**
 * Global click ripple removed. It forced layout reads on every
 * pointer-down and interfered with native click feedback.
 */
export function ClickRipple() {
  return null;
}
