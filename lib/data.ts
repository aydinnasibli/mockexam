export type ExamType = 'sat' | 'ielts' | 'toefl' | 'dim' | 'gre';

export interface Exam {
  id: string;
  title: string;
  type: ExamType;
  description: string;
  tag: string;
  price: number;
  durationMinutes: number;
  totalQuestions: number;
  features: string[];
}

export const mockExams: Exam[] = [
  {
    id: "sat-mock-1",
    title: "Digital SAT Full Mock #1",
    type: "sat",
    description: "College Board-un Bluebook formatına 100% uyğunlaşdırılmış rəqəmsal SAT sınağı. Reading/Writing və Math bölmələri adaptive rejimdə verilir.",
    tag: "SAT",
    price: 12,
    durationMinutes: 134,
    totalQuestions: 98,
    features: ["Adaptive modul sistemi", "Dərhal bal hesablaması", "Hər soruya izahat", "Rəsmi Bluebook interfeysi"]
  },
  {
    id: "sat-mock-2",
    title: "Digital SAT Full Mock #2",
    type: "sat",
    description: "1500+ bal hədəfi olan tələbələr üçün seçilmiş çətin suallardan ibarət ikinci tam SAT sınağı.",
    tag: "SAT",
    price: 12,
    durationMinutes: 134,
    totalQuestions: 98,
    features: ["Yüksək çətinlik suallar", "Riyaziyyat focus bölməsi", "Detallı nəticə analizi", "Rəsmi Bluebook interfeysi"]
  },
  {
    id: "sat-mock-3",
    title: "Digital SAT Full Mock #3",
    type: "sat",
    description: "SAT hazırlığı üçün üçüncü tam sınaq paketi. Bütün mövzu sahələri bərabər əhatə olunub.",
    tag: "SAT",
    price: 12,
    durationMinutes: 134,
    totalQuestions: 98,
    features: ["Balanslaşdırılmış sual paylanması", "Reading mövzu analizi", "Vaxt idarəetmə tövsiyələri", "Rəsmi Bluebook interfeysi"]
  },
  {
    id: "ielts-academic-1",
    title: "IELTS Academic Mock #1",
    type: "ielts",
    description: "Kompüter əsaslı həqiqi IELTS mühitini simulyasiya edən tam sınaq. Listening, Reading və Writing bölmələri daxildir.",
    tag: "IELTS",
    price: 15,
    durationMinutes: 165,
    totalQuestions: 80,
    features: ["Band score hesablaması", "Listening audio simulyasiyası", "Academic Writing qiymətləndirilməsi", "Mövzu üzrə zəiflik analizi"]
  },
  {
    id: "ielts-general-1",
    title: "IELTS General Training Mock #1",
    type: "ielts",
    description: "İmmiqrasiya və peşəkar qeydiyyat üçün IELTS General Training sınağı. Əsas fərqlər: Reading mövzuları və Writing tapşırıqları.",
    tag: "IELTS",
    price: 15,
    durationMinutes: 165,
    totalQuestions: 80,
    features: ["General Training formatı", "Letter writing tapşırığı", "Gündəlik həyat reading mətnləri", "Band score hesablaması"]
  },
  {
    id: "toefl-ibt-1",
    title: "TOEFL iBT Full Mock #1",
    type: "toefl",
    description: "ETS-in rəsmi TOEFL iBT formatına uyğun hazırlanmış tam sınaq. Reading, Listening, Speaking və Writing bölmələri daxildir.",
    tag: "TOEFL",
    price: 18,
    durationMinutes: 180,
    totalQuestions: 70,
    features: ["4 bölmə tam simulyasiya", "Integrated Writing tapşırığı", "Speaking nümunə cavablar", "Bal çevirmə cədvəli"]
  },
  {
    id: "toefl-ibt-2",
    title: "TOEFL iBT Full Mock #2",
    type: "toefl",
    description: "Akademik mühiti hədəfləyən konkret universitet tələblərinə hazır tam TOEFL iBT sınağı ikinci səviyyə.",
    tag: "TOEFL",
    price: 18,
    durationMinutes: 180,
    totalQuestions: 70,
    features: ["Çətin akademik mətnlər", "3 Listening lecture", "Independent Writing prompts", "Bal çevirmə cədvəli"]
  },
  {
    id: "dim-blok-1",
    title: "DİM Qəbul Sınağı — I Qrup",
    type: "dim",
    description: "DİM proqramına uyğun I Qrup sınağı: Riyaziyyat, Fizika, Kimya. Hər bölmə ayrıca qiymətləndirilir.",
    tag: "DİM",
    price: 8,
    durationMinutes: 180,
    totalQuestions: 90,
    features: ["3 fənn bölməsi", "Açıq sualların analizi", "Mövzu çatışmazlığı xəritəsi", "Rəsmi DİM proqramı"]
  },
  {
    id: "dim-blok-2",
    title: "DİM Qəbul Sınağı — II Qrup",
    type: "dim",
    description: "DİM II Qrup: Riyaziyyat, Biologiya, Kimya fənlərindən ibarət tam qəbul sınağı.",
    tag: "DİM",
    price: 8,
    durationMinutes: 180,
    totalQuestions: 90,
    features: ["Biologiya diaqram sualları", "Kimya hesablama tapşırıqları", "Mövzu çatışmazlığı xəritəsi", "Rəsmi DİM proqramı"]
  },
  {
    id: "dim-buraxilis-1",
    title: "DİM Buraxılış İmtahanı (11-ci sinif)",
    type: "dim",
    description: "Azərbaycan dili, Riyaziyyat və İngilis dili fənləri üzrə DİM formatına tam uyğun buraxılış sınağı.",
    tag: "DİM",
    price: 8,
    durationMinutes: 180,
    totalQuestions: 85,
    features: ["3 buraxılış fənni", "Qrammatika qaydaları", "Mətn anlama sualları", "Hər fənn üzrə statistika"]
  },
  {
    id: "gre-general-1",
    title: "GRE General Test Mock #1",
    type: "gre",
    description: "Magistratura proqramları üçün GRE General Test sınağı. Verbal Reasoning, Quantitative Reasoning və Analytical Writing daxildir.",
    tag: "GRE",
    price: 20,
    durationMinutes: 225,
    totalQuestions: 82,
    features: ["Verbal + Quant + AWA", "ETS rəsmi sual tipləri", "Adaptiv test strukturu", "Percentile hesablaması"]
  },
];

export const examTypeLabels: Record<ExamType, string> = {
  sat: "SAT",
  ielts: "IELTS",
  toefl: "TOEFL",
  dim: "DİM",
  gre: "GRE",
};
