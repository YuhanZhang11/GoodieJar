import { JarPage, JarPagePlaceholder } from '@/components/jar-page';

export default function AchievementsScreen() {
  return (
    <JarPage>
      <JarPagePlaceholder
        title="Achievements"
        emptyMessage="Celebrate something you accomplished."
        actionLabel="Add Achievement"
      />
    </JarPage>
  );
}
