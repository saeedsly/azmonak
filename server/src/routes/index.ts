import { Router } from 'express';
import { coursesRouter } from './admin/courses.routes.js';
import { examsRouter, invitesRouter, questionsRouter } from './admin/exams.routes.js';
import { attemptsRouter } from './admin/attempts.routes.js';
import { resultsRouter } from './admin/results.routes.js';
import { aiRouter, uploadsRouter } from './admin/ai.routes.js';
import { systemRouter } from './admin/system.routes.js';

export const adminRouter = Router();

adminRouter.use('/courses', coursesRouter);
adminRouter.use('/exams', examsRouter);
adminRouter.use('/questions', questionsRouter);
adminRouter.use('/invites', invitesRouter);
adminRouter.use('/attempts', attemptsRouter);
adminRouter.use('/results', resultsRouter);
adminRouter.use('/ai', aiRouter);
adminRouter.use('/uploads', uploadsRouter);
adminRouter.use('/', systemRouter);
