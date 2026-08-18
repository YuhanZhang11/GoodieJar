import { JarPage, JarPagePlaceholder } from '@/components/jar-page';

export default function RewardsScreen() {
  return (
    <JarPage>
      <JarPagePlaceholder
        title="Your Goodies"
        emptyMessage="No goodies yet."
        actionLabel="Add Reward"
      />
    </JarPage>
  );
}
