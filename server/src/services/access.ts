import type { Kysely } from 'kysely';
import type { Database, ExamsTable, InvitesTable } from '../db/types.js';
import { findExamByAccessCode, findInviteByCode, getExam } from '../db/repos.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';

export interface ResolvedAccess {
  exam: ExamsTable;
  invite: InvitesTable | null;
  identityRequired: {
    name: boolean;
    email: boolean;
    phone: boolean;
    nationalCode: boolean;
  };
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

/** پیدا کردن آزمون از روی کلید عمومی یا کد اختصاصی فراگیر. */
export async function resolveAccessCode(
  db: Kysely<Database>,
  rawCode: string,
): Promise<ResolvedAccess> {
  const code = normalizeCode(rawCode);
  if (!code) throw badRequest('کد دسترسی را وارد کنید.');

  let exam: ExamsTable | undefined;
  let invite: InvitesTable | null = null;

  const direct = await findExamByAccessCode(db, code);
  if (direct) {
    exam = direct;
  } else {
    invite = (await findInviteByCode(db, code)) ?? null;
    if (!invite) throw notFound('کد دسترسی معتبر نیست.');
    if (invite.isActive !== 1) throw forbidden('این کد دسترسی غیرفعال شده است.');
    if (invite.expiresAt && invite.expiresAt < Date.now()) {
      throw forbidden('مهلت استفاده از این کد به پایان رسیده است.');
    }
    if (invite.usedCount >= invite.maxUses) {
      throw forbidden('این کد قبلاً استفاده شده است.');
    }
    exam = await getExam(db, invite.examId);
    if (!exam) throw notFound('آزمون مرتبط با این کد یافت نشد.');
  }

  if (exam.status === 'DRAFT') throw forbidden('این آزمون هنوز منتشر نشده است.');
  if (exam.status === 'ARCHIVED') throw forbidden('این آزمون بایگانی شده است.');
  if (exam.status === 'CLOSED') throw forbidden('این آزمون بسته شده است.');

  const now = Date.now();
  if (exam.startAt && now < exam.startAt) {
    throw forbidden('زمان شرکت در این آزمون هنوز آغاز نشده است.');
  }
  if (exam.endAt && now > exam.endAt) {
    throw forbidden('مهلت شرکت در این آزمون به پایان رسیده است.');
  }

  return {
    exam,
    invite,
    identityRequired: {
      name: exam.requireName === 1,
      email: exam.requireEmail === 1,
      phone: exam.requirePhone === 1,
      nationalCode: exam.requireNationalCode === 1,
    },
  };
}
