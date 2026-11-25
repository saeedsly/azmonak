import { ACCESS_CODE_ALPHABET } from '@azmoonak/shared';

const LETTERS = ACCESS_CODE_ALPHABET.slice(0, 24);
const DIGITS = '23456789';

function pick(list: string): string {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list: string[]): string[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** کد عمومی آزمون: AZM-XXXX */
export function generateAccessCode(): string {
  let body = '';
  for (let i = 0; i < 4; i += 1) body += pick(LETTERS);
  return `AZM-${body}`;
}

/** کد اختصاصی هر فراگیر: XXXX-XXXX */
export function generateInviteCode(): string {
  const chars = shuffle([...LETTERS, ...DIGITS]);
  const pickChars = (n: number) => chars.slice(0, n).join('');
  return `${pickChars(4)}-${pickChars(4)}`;
}
