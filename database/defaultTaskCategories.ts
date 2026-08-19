export const OTHER_TASK_CATEGORY_ID = 'task_category_other';

export const DEFAULT_TASK_CATEGORIES = [
  { id: 'task_category_study', name: 'Study' },
  { id: 'task_category_work', name: 'Work' },
  { id: 'task_category_career', name: 'Career' },
  { id: 'task_category_daily_task', name: 'Daily Task' },
  { id: 'task_category_exercise', name: 'Exercise' },
  { id: 'task_category_health', name: 'Health' },
  { id: 'task_category_personal_project', name: 'Personal Project' },
  { id: OTHER_TASK_CATEGORY_ID, name: 'Other' },
] as const;
