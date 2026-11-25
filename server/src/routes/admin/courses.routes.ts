import { Router } from 'express';
import { courseInputSchema, courseUpdateSchema, listQuerySchema } from '@azmoonak/shared';
import { getDb } from '../../db/index.js';
import {
  createCourse,
  deleteCourse,
  getCourse,
  listCourses,
  updateCourse,
} from '../../db/repos.js';
import { mapCourse } from '../../db/mappers.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { parseSafe } from '../../middleware/error.js';

export const coursesRouter = Router();

coursesRouter.get('/', async (req, res) => {
  const query = parseSafe(listQuerySchema.pick({ search: true }).partial(), req.query);
  const db = await getDb();
  const rows = await listCourses(db, {
    search: query.search,
    includeArchived: req.query.includeArchived === 'true',
  });
  res.json({
    items: rows.map((row) => ({
      ...mapCourse(row),
      examCount: Number(row.examCount ?? 0),
      questionCount: Number(row.questionCount ?? 0),
    })),
  });
});

coursesRouter.post('/', async (req, res) => {
  const input = parseSafe(courseInputSchema, req.body);
  const db = await getDb();
  const row = await createCourse(db, { ...input, createdBy: req.user?.sub ?? null });
  await updateCourse(db, row.id, {});
  res.status(201).json(mapCourse(row));
});

coursesRouter.get('/:id', async (req, res) => {
  const db = await getDb();
  const row = await getCourse(db, req.params.id);
  if (!row) throw notFound('دوره یافت نشد.');
  res.json(mapCourse(row));
});

coursesRouter.patch('/:id', async (req, res) => {
  const input = parseSafe(courseUpdateSchema, req.body);
  const db = await getDb();
  const row = await getCourse(db, req.params.id);
  if (!row) throw notFound('دوره یافت نشد.');
  await updateCourse(db, row.id, {
    title: input.title ?? row.title,
    description: input.description ?? row.description,
    code: input.code ?? row.code,
    instructor: input.instructor ?? row.instructor,
    color: input.color ?? row.color,
    isArchived: input.isArchived === undefined ? row.isArchived : input.isArchived ? 1 : 0,
  });
  const updated = await getCourse(db, row.id);
  res.json(mapCourse(updated!));
});

coursesRouter.delete('/:id', async (req, res) => {
  const db = await getDb();
  const row = await getCourse(db, req.params.id);
  if (!row) throw notFound('دوره یافت نشد.');
  await deleteCourse(db, row.id);
  res.json({ ok: true });
});

coursesRouter.post('/:id/duplicate', async (req, res) => {
  const db = await getDb();
  const row = await getCourse(db, req.params.id);
  if (!row) throw notFound('دوره یافت نشد.');
  const copy = await createCourse(db, {
    title: `${row.title} (کپی)`,
    description: row.description,
    code: '',
    instructor: row.instructor,
    color: row.color,
    createdBy: req.user?.sub ?? null,
  });
  res.status(201).json(mapCourse(copy));
});
