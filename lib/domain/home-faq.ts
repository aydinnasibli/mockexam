/**
 * The homepage FAQ, in one place.
 *
 * Lifted out of `HomeContent.tsx` because it is now read twice: the client
 * component renders it as <details>, and the server component wraps it in
 * FAQPage JSON-LD. Keeping one array means the markup can never describe a
 * question the page does not display — which is the rule that makes FAQ
 * structured data legitimate rather than a violation.
 */
export const HOME_FAQ = [
  { q: 'Bal necə hesablanır?',      a: 'Rəsmi çevirmə cədvəli ilə — SAT-da şkala, IELTS-də band.' },
  { q: 'Təkrar cəhd olur?',         a: 'Limitsiz. Hər cəhd ayrı hesabatla saxlanılır.' },
  { q: 'Abunəlik var?',             a: 'Yox. Bir sınaq — bir ödəniş, müddətsiz giriş.' },
  { q: 'Sınaq yarımçıq qalarsa?',   a: 'Sessiya serverdə qalır, vaxt rəsmi qaydada davam edir.' },
  { q: 'Yazı hissəsi qiymətlənir?', a: 'Rəsmi rubrika üzrə, hər kriteriya ayrı balla.' },
] as const;
