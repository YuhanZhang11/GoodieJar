import { JarPage } from '@/components/jar-page';

export default function TasksScreen() {
  return (
    <JarPage
      title="Tasks"
      emptyTitle="Your Tasks"
      emptyMessage="No tasks yet."
      actionLabel="Add Task"
    />
  );
}
