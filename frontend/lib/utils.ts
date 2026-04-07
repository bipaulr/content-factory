/**
 * Combine classnames conditionally
 * Similar to clsx or classnames utility
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
