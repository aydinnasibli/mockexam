import { getWritingEvalProblems } from '@/lib/actions/results';
import WritingProblemsClient from './WritingProblemsClient';
import { requireAdminPage } from '@/lib/admin';

export const metadata = { title: 'Yazı Qiymətləndirmə — Admin' };

// Always fresh — the admin needs the current pending count.
export const dynamic = 'force-dynamic';

export default async function AdminWritingPage() {
  await requireAdminPage();
  const problems = await getWritingEvalProblems();
  const pendingEssays = problems.reduce((s, p) => s + p.pendingCount, 0);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">
          Yazı Qiymətləndirmə
        </h1>
        <p className="text-on-surface-variant font-medium text-sm">
          AI qiymətləndirə bilmədiyi (gözləyən) yazı tapşırıqlarını burada görüb yenidən işə sala bilərsiniz.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Problemli nəticə', value: problems.length },
          { label: 'Gözləyən esse', value: pendingEssays },
          { label: 'Status', value: problems.length === 0 ? 'Təmiz' : 'Diqqət' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-outline-variant/40 p-4 shadow-sm">
            <p className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-black ${label === 'Status' && problems.length > 0 ? 'text-amber-600' : 'text-primary'}`}>{value}</p>
          </div>
        ))}
      </div>

      <WritingProblemsClient problems={problems} />
    </div>
  );
}
