import type { Metadata } from 'next';
import Navbar from "@/components/layout/Navbar";
import FadeUp from "@/components/ui/FadeUp";
import { StaggerContainer, StaggerItem } from "@/components/ui/StaggerChildren";

export const metadata: Metadata = {
  title: 'Haqqımızda',
  description: 'Azərbaycanın ən qabaqcıl imtahan hazırlığı platforması. 2022-ci ildən SAT, IELTS, TOEFL və DİM hazırlığında 50,000+ tələbəyə xidmət göstəririk.',
  openGraph: {
    title: 'Haqqımızda — Məşqçi',
    description: 'Azərbaycanın ən qabaqcıl imtahan hazırlığı platforması. 2022-ci ildən SAT, IELTS, TOEFL və DİM hazırlığında 50,000+ tələbəyə xidmət göstəririk.',
    url: '/about',
  },
  twitter: {
    title: 'Haqqımızda — Məşqçi',
    description: 'Azərbaycanın ən qabaqcıl imtahan hazırlığı platforması. 2022-ci ildən SAT, IELTS, TOEFL və DİM hazırlığında 50,000+ tələbəyə xidmət göstəririk.',
  },
};
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { BadgeCheck, Eye, Rocket, Users, BookOpen, Star, TrendingUp } from "lucide-react";

const stats = [
  { value: "50K+",  label: "Aktiv istifadəçi",  icon: Users },
  { value: "100+",  label: "İmtahan paketi",     icon: BookOpen },
  { value: "1M+",   label: "Test iştirakı",      icon: TrendingUp },
  { value: "98%",   label: "Razılıq dərəcəsi",   icon: Star },
];

const values = [
  {
    icon: BadgeCheck,
    title: "Keyfiyyət",
    description:
      "Hər test paketi ekspert komandamız tərəfindən hazırlanır və rəsmi imtahan formatlarına tam uyğunlaşdırılır.",
  },
  {
    icon: Eye,
    title: "Şəffaflıq",
    description:
      "Nəticələriniz, analitikanız və inkişaf yolunuz haqqında tam açıq məlumat alırsınız.",
  },
  {
    icon: Rocket,
    title: "İnnovasiya",
    description:
      "Ən müasir texnologiyalardan istifadə edərək sizə həqiqi imtahan mühiti yaradırıq.",
  },
];

const team = [
  { name: "Anar Məmmədov",   role: "Qurucu & CEO",                   initials: "AM", color: "from-blue-500 to-blue-700" },
  { name: "Gülnar Hüseynova", role: "Baş Məzmun Direktoru",           initials: "GH", color: "from-purple-500 to-purple-700" },
  { name: "Tural Əliyev",    role: "Texnologiya Direktoru",           initials: "TƏ", color: "from-emerald-500 to-emerald-700" },
  { name: "Nigar Quliyeva",  role: "Müştəri Uğuru Direktoru",        initials: "NQ", color: "from-amber-500 to-amber-700" },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-16 bg-surface-container-low">
          <FadeUp className="max-w-5xl mx-auto px-6 text-center">
            <span className="inline-flex items-center gap-2 bg-secondary/10 text-secondary font-bold text-xs px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
              Haqqımızda
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-primary font-headline leading-tight mb-6">
              Azərbaycanın ən qabaqcıl<br />
              <span className="text-secondary">imtahan hazırlığı platforması</span>
            </h1>
            <p className="text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              Biz Azərbaycanda imtahan hazırlığını yenidən müəyyənləşdiririk. SAT-dan DİM-ə qədər hər imtahan üçün
              professional, adaptiv və əlçatan hazırlıq mühiti yaradırıq.
            </p>
          </FadeUp>
        </section>

        {/* Stats */}
        <section className="py-16 bg-surface">
          <div className="max-w-5xl mx-auto px-6">
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map(({ value, label, icon: Icon }) => (
                <StaggerItem key={label}>
                  <div className="text-center p-6 bg-white rounded-2xl border border-outline-variant/40 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 editorial-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Icon className="text-white" size={22} />
                    </div>
                    <p className="text-3xl font-black text-primary font-headline">{value}</p>
                    <p className="text-sm text-on-surface-variant mt-1 font-medium">{label}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* Story */}
        <section className="py-20 bg-surface-container-low">
          <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <span className="text-secondary font-bold text-xs uppercase tracking-widest mb-3 block">Hekayəmiz</span>
              <h2 className="text-3xl font-black text-primary font-headline mb-5">Niyə Test Centre-i yaratdıq?</h2>
              <div className="space-y-4 text-on-surface-variant leading-relaxed text-sm">
                <p>
                  2022-ci ildə bir qrup tələbə ilə söhbət edərək başa düşdük ki, Azərbaycanda keyfiyyətli imtahan
                  sınağı platforması olduqca az sayda mövcuddur. Mövcud həllər ya köhnəlmiş, ya da əlçatan deyildi.
                </p>
                <p>
                  Biz bunu dəyişmək qərarına gəldik. Test Centre, tələbələrə real imtahan mühitini simulyasiya
                  edən, ətraflı analitika təqdim edən və peşəkar hazırlığı hamı üçün əlçatan edən platform olaraq
                  yaradıldı.
                </p>
                <p>
                  Bu gün 50,000-dən çox tələbə platformamızdan istifadə edir və onların böyük əksəriyyəti hədəf
                  ballarına çatmağa müvəffəq olur.
                </p>
              </div>
            </FadeUp>

            <FadeUp delay={0.1} className="relative">
              <div className="aspect-square rounded-3xl editorial-gradient overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-10 grid grid-cols-6 gap-4 p-8">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-white rounded-lg" />
                  ))}
                </div>
                <div className="relative z-10 text-center text-white p-8">
                  <p className="text-7xl font-black font-headline mb-2">2022</p>
                  <p className="text-lg font-bold opacity-80">Azərbaycanda ilk</p>
                  <p className="text-sm opacity-60 mt-1">Digital Sınaq Platforması</p>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl border border-outline-variant/40 p-4">
                <p className="text-2xl font-black text-primary font-headline">50K+</p>
                <p className="text-xs text-on-surface-variant font-medium">Aktiv tələbə</p>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-surface">
          <div className="max-w-5xl mx-auto px-6">
            <FadeUp className="text-center mb-12">
              <span className="text-secondary font-bold text-xs uppercase tracking-widest mb-3 block">Dəyərlərimiz</span>
              <h2 className="text-3xl font-black text-primary font-headline">Bizi fərqləndirən nədir?</h2>
            </FadeUp>
            <StaggerContainer className="grid md:grid-cols-3 gap-6">
              {values.map(({ icon: Icon, title, description }) => (
                <StaggerItem key={title}>
                  <div className="p-7 bg-white rounded-2xl border border-outline-variant/40 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
                    <div className="w-12 h-12 editorial-gradient rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                      <Icon className="text-white" size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-primary font-headline mb-3">{title}</h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">{description}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* Team */}
        <section className="py-20 bg-surface-container-low">
          <div className="max-w-5xl mx-auto px-6">
            <FadeUp className="text-center mb-12">
              <span className="text-secondary font-bold text-xs uppercase tracking-widest mb-3 block">Komandamız</span>
              <h2 className="text-3xl font-black text-primary font-headline">Arxanızdakı insanlar</h2>
            </FadeUp>
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {team.map(({ name, role, initials, color }) => (
                <StaggerItem key={name}>
                  <div className="text-center group">
                    <div
                      className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-4 group-hover:-translate-y-1 transition-transform shadow-lg`}
                    >
                      <span className="text-white text-2xl font-black font-headline">{initials}</span>
                    </div>
                    <h3 className="font-bold text-primary text-sm font-headline">{name}</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">{role}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-surface">
          <div className="max-w-3xl mx-auto px-6">
            <FadeUp className="editorial-gradient rounded-3xl p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-3xl font-black text-white font-headline mb-4">Bizimlə böyüyün</h2>
                <p className="text-white/70 mb-8 leading-relaxed max-w-md mx-auto">
                  Azərbaycanın ən böyük imtahan hazırlığı cəmiyyətinə qoşulun. Pulsuz başlayın, fərqi hiss edin.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/exams"
                    className="bg-white text-primary font-bold px-8 py-3 rounded-xl hover:bg-surface-container-low transition-colors"
                  >
                    Sınaqları kəşf et
                  </Link>
                  <Link
                    href="/contact"
                    className="border-2 border-white/30 text-white font-bold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Bizimlə əlaqə
                  </Link>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
