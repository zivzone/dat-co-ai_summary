import { DashboardClient } from '@/components/DashboardClient';
import { getIndicatorPayload } from '@/lib/indicator';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const payload = await getIndicatorPayload();
  return <DashboardClient initialPayload={payload} />;
}
