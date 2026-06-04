/**
 * Radix Dialog trata el contenido de un Select (que vive en un portal) como
 * "fuera" del diálogo; sin esto, hacer clic en el Select cerraría el modal.
 * Devuelve `true` si el target pertenece a un portal de Radix que debe ignorarse
 * en los handlers de `onInteractOutside`/`onPointerDownOutside`/`onFocusOutside`.
 */
export function isRadixPortalLayerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-slot="select-content"]'));
}
