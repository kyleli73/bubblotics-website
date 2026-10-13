/*
 * Builds one element with an optional class and text. The newsletter scripts
 * build their rows with this. Text goes in with textContent, so a title typed
 * by the team is shown as text and is never read as HTML.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
