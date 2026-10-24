/** Gera um id curto e estável para itens criados no painel. */
export function createId(prefix: string): string {
  const randomId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : String(Date.now()).slice(-8);
  return `${prefix}-${randomId}`;
}
