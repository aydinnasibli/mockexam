import ImportExamClient from './ImportExamClient';
import { requireAdminPage } from '@/lib/infra/admin';

export default async function ImportExamPage() {
  // Same page-level guard as every other admin route — see `requireAdminPage`.
  // The form itself is client-side, so the check lives in this server wrapper.
  await requireAdminPage();

  return <ImportExamClient />;
}
