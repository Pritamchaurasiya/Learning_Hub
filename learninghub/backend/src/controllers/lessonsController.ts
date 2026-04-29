import { Request, Response } from 'express';
import { prisma } from '../prismaClient';

export const getCourseLessons = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.params.id as string;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, content: true }
    });

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Get modules with lessons ordered properly
    const modules = await prisma.module.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            order: true,
            isFree: true,
            videoUrl: true,
            transcript: true,
            resources: true
          }
        }
      }
    });

    // Transform to CourseSection shape expected by frontend
    const sections = modules.map(mod => ({
      id: mod.id,
      title: mod.title,
      lessons: mod.lessons.map(les => ({
        id: les.id,
        title: les.title,
        description: les.description || '',
        duration: Math.round(les.duration / 60), // convert seconds to minutes
        video_url: les.videoUrl,
        completed: false,
        order: les.order,
        is_free: les.isFree
      }))
    }));

    res.json({ status: 'success', data: sections });
  } catch (error) {
    console.error('GetCourseLessons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLesson = async (req: Request, res: Response): Promise<void> => {
  const courseId = req.params.id as string;
  const lessonId = req.params.lessonId as string;

  // Find the lesson with its module and course
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        select: {
          id: true,
          title: true,
          order: true,
          courseId: true,
          course: {
            select: { id: true, title: true, content: true }
          }
        }
      }
    }
  });

  if (!lesson || lesson.module.courseId !== courseId) {
    res.status(404).json({ error: 'Lesson not found in this course' });
    return;
  }

  res.json({
    status: 'success',
    data: {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description || '',
      video_url: lesson.videoUrl,
      duration: Math.round(lesson.duration / 60),
      order: lesson.order,
      is_free: lesson.isFree,
      transcript: lesson.transcript || lesson.module.course.content || '',
      resources: lesson.resources ? JSON.parse(lesson.resources) : [],
      completed: false
    }
  });
};

export const getCourseProgress = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const courseId = req.params.id as string;

    const progress = await prisma.userProgress.findUnique({
      where: {
        userId_courseId: { userId, courseId }
      }
    });

    if (!progress) {
      res.json({
        status: 'success',
        data: {
          course_id: courseId,
          progress_percent: 0,
          completed_lessons: 0,
          total_lessons: 0,
          last_accessed: null
        }
      });
      return;
    }

    // Calculate completed lessons count
    const completedLessons = await prisma.lessonCompletion.count({
      where: {
        userId,
        lesson: {
          module: { courseId }
        }
      }
    });

    const totalLessons = await prisma.lesson.count({
      where: {
        module: { courseId }
      }
    });

    res.json({
      status: 'success',
      data: {
        course_id: courseId,
        progress_percent: progress.progress,
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        last_accessed: progress.updatedAt
      }
    });
  } catch (error) {
    console.error('GetCourseProgress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateLessonProgress = async (req: any, res: Response): Promise<void> => {
  const { id: courseId } = req.params;
  const { progress_percent, watch_time_seconds, completed } = req.body;
  const userId = req.user.userId;

  try {
    await prisma.userProgress.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {
        progress: progress_percent,
        status: completed ? 'completed' : 'started',
        updatedAt: new Date()
      },
      create: {
        userId,
        courseId,
        progress: progress_percent,
        status: completed ? 'completed' : 'started'
      }
    });
    res.json({
      status: 'success',
      data: { lesson_id: req.params.lessonId, progress_percent, completed }
    });
  } catch (error) {
    console.error('UpdateLessonProgress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const completeLesson = async (req: any, res: Response): Promise<void> => {
  const { id: courseId } = req.params;
  const userId = req.user.userId;

  try {
    // Mark course as 100% complete and award XP (100)
    await prisma.userProgress.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { progress: 100, status: 'completed' },
      create: { userId, courseId, progress: 100, status: 'completed' }
    });

    // Award XP
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: 100 } }
    });

    res.json({ status: 'success', message: 'Lesson completed' });
  } catch (error) {
    console.error('CompleteLesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLessonNotes = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.userId;
  const { courseId } = req.params;

  const note = await prisma.note.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { content: true, updatedAt: true }
  });

  res.json({
    status: 'success',
    data: {
      notes: note?.content || '',
      updated_at: note?.updatedAt
    }
  });
};

export const saveLessonNotes = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.userId;
  const { courseId } = req.params;
  const { notes } = req.body;

  await prisma.note.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: { content: notes, updatedAt: new Date() },
    create: { userId, courseId, content: notes }
  });

  res.json({ status: 'success', message: 'Notes saved' });
};

export const getNextLesson = async (req: any, res: Response): Promise<void> => {
  try {
    const courseId = req.params.id as string;
    const currentLessonId = req.params.lessonId as string;

    // Find current lesson order
    const currentLesson = await prisma.lesson.findUnique({
      where: { id: currentLessonId },
      include: { module: true }
    });

    if (!currentLesson) {
      res.status(404).json({ error: 'Current lesson not found' });
      return;
    }

    // Find next lesson in same module
    const nextLesson = await prisma.lesson.findFirst({
      where: {
        moduleId: currentLesson.moduleId,
        order: { gt: currentLesson.order }
      },
      orderBy: { order: 'asc' },
      include: { module: true }
    });

    if (!nextLesson) {
      // Check next module's first lesson
      const nextModule = await prisma.module.findFirst({
        where: {
          courseId,
          order: { gt: currentLesson.module.order }
        },
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' }, take: 1 } }
      });

      if (!nextModule || nextModule.lessons.length === 0) {
        res.json({
          status: 'success',
          message: 'This is the last lesson',
          data: null
        });
        return;
      }

      const firstNextLesson = nextModule.lessons[0];
      res.json({
        status: 'success',
        data: {
          id: firstNextLesson.id,
          title: firstNextLesson.title,
          module_id: firstNextLesson.moduleId,
          module_title: nextModule.title,
          order: firstNextLesson.order
        }
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        id: nextLesson.id,
        title: nextLesson.title,
        module_id: nextLesson.moduleId,
        module_title: nextLesson.module.title,
        order: nextLesson.order
      }
    });
  } catch (error) {
    console.error('GetNextLesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPreviousLesson = async (req: any, res: Response): Promise<void> => {
  try {
    const courseId = req.params.id as string;
    const currentLessonId = req.params.lessonId as string;

    // Find current lesson order
    const currentLesson = await prisma.lesson.findUnique({
      where: { id: currentLessonId },
      include: { module: true }
    });

    if (!currentLesson) {
      res.status(404).json({ error: 'Current lesson not found' });
      return;
    }

    // Find previous lesson in same module
    const prevLesson = await prisma.lesson.findFirst({
      where: {
        moduleId: currentLesson.moduleId,
        order: { lt: currentLesson.order }
      },
      orderBy: { order: 'desc' },
      include: { module: true }
    });

    if (!prevLesson) {
      // Check previous module's last lesson
      const prevModule = await prisma.module.findFirst({
        where: {
          courseId,
          order: { lt: currentLesson.module.order }
        },
        orderBy: { order: 'desc' },
        include: { lessons: { orderBy: { order: 'desc' }, take: 1 } }
      });

      if (!prevModule || prevModule.lessons.length === 0) {
        res.json({
          status: 'success',
          message: 'This is the first lesson',
          data: null
        });
        return;
      }

      const lastPrevLesson = prevModule.lessons[0];
      res.json({
        status: 'success',
        data: {
          id: lastPrevLesson.id,
          title: lastPrevLesson.title,
          module_id: lastPrevLesson.moduleId,
          module_title: prevModule.title,
          order: lastPrevLesson.order
        }
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        id: prevLesson.id,
        title: prevLesson.title,
        module_id: prevLesson.moduleId,
        module_title: prevLesson.module.title,
        order: prevLesson.order
      }
    });
  } catch (error) {
    console.error('GetPreviousLesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
