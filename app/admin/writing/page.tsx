import { getWritingEvalProblems } from '@/lib/actions/results';
import WritingProblemsClient from './WritingProblemsClient';
import AdminPageHeader from '../PageHeader';
import { requireAdminPage } from '@/lib/infra/admin';

export const metadata = { title: 'Yazı Qiymətləndirmə — Admin' };

// Always fresh — the admin needs the current pending count.
export const dynamic = 'force-dynamic';

export default async function AdminWritingPage() {
  await requireAdminPage();
  const problems = await getWritingEvalProblems();
  const pendingEssays = problems.reduce((s, p) => s + p.pendingCount, 0);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Qiymətləndirmə"
        title="Yazı qiymətləndirmə."
        meta="AI qiymətləndirə bilmədiyi (gözləyən) yazı tapşırıqlarını burada görüb yenidən işə sala bilərsiniz."
      />

      <div className="rounded-panel border border-rule bg-surface mb-6 grid grid-cols-1 gap-px overflow-hidden bg-rule sm:grid-cols-3">
        {[
          { label: 'Problemli nəticə', value: String(problems.length) },
          { label: 'Gözləyən esse',    value: String(pendingEssays) },
          { label: 'Status',           value: problems.length === 0 ? 'Təmiz' : 'Diqqət', warn: problems.length > 0 },
        ].map(({ label, value, warn }) => (
          <div key={label} className="bg-surface px-5 py-5">
            <div className={`font-mono font-light tracking-[-0.03em] tabular-nums lining-nums leading-none text-ink text-3xl ${warn ? 'text-warn' : ''}`}>{value}</div>
            <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-2.5">{label}</p>
          </div>
        ))}
      </div>

      <WritingProblemsClient problems={problems} />
    </div>
  );
}
