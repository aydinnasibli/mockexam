'use client';

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { MapPin, Phone, Mail, Globe, Send, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const contactInfo = [
  { icon: MapPin, title: "Ünvanımız",  info: "Nizami küçəsi 65, Bakı",     sub: "Azərbaycan, AZ1010" },
  { icon: Phone,  title: "Telefon",    info: "+994 12 XXX XX XX",           sub: "B.e. – Cüm: 09:00–18:00" },
  { icon: Mail,   title: "E-poçt",     info: "info@testcentre.az",          sub: "24 saat ərzində cavab" },
];

const socialLabels = ["FB", "IG", "LI"];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-12 bg-surface-container-low">
          <motion.div
            className="max-w-4xl mx-auto px-6 text-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
          >
            <span className="inline-flex items-center gap-2 bg-secondary/10 text-secondary font-bold text-xs px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
              Əlaqə
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-primary font-headline mb-4">
              Bizimlə əlaqə saxlayın
            </h1>
            <p className="text-on-surface-variant text-lg max-w-xl mx-auto">
              Sualınız var? Komandamız sizə kömək etməyə hazırdır.
            </p>
          </motion.div>
        </section>

        <section className="py-14 bg-surface">
          <div className="max-w-4xl mx-auto px-6">
            {/* Info Cards */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
            >
              {contactInfo.map(({ icon: Icon, title, info, sub }) => (
                <motion.div
                  key={title}
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } } }}
                  className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-6 text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 editorial-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="text-white" size={20} />
                  </div>
                  <h3 className="font-bold text-primary text-sm font-headline mb-1">{title}</h3>
                  <p className="text-on-surface text-sm font-semibold">{info}</p>
                  <p className="text-on-surface-variant text-xs mt-1">{sub}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Split Layout */}
            <div className="grid md:grid-cols-2 gap-10 items-start">
              {/* Left: Contact details card */}
              <motion.div
                className="editorial-gradient rounded-2xl p-8 text-white relative overflow-hidden"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                <div className="relative z-10">
                  <h2 className="text-2xl font-black font-headline mb-3">Əlaqə məlumatları</h2>
                  <p className="text-white/70 text-sm mb-8 leading-relaxed">
                    Formu doldurun ya da birbaşa əlaqə məlumatlarından istifadə edin — tezliklə cavab verəcəyik.
                  </p>

                  <div className="space-y-4">
                    {[
                      { icon: MapPin, text: "Nizami küçəsi 65, Bakı" },
                      { icon: Phone,  text: "+994 12 XXX XX XX" },
                      { icon: Mail,   text: "info@testcentre.az" },
                      { icon: Globe,  text: "www.testcentre.az" },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon size={16} />
                        </div>
                        <span className="text-sm font-medium text-white/90">{text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-10 pt-6 border-t border-white/20">
                    <p className="text-xs text-white/50 font-semibold uppercase tracking-wider mb-3">Sosial şəbəkələr</p>
                    <div className="flex gap-3">
                      {socialLabels.map(s => (
                        <div
                          key={s}
                          className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <span className="text-xs font-bold text-white">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right: Form */}
              <motion.div
                className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-8"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
              >
                <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="text-emerald-600" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-primary font-headline mb-2">Mesajınız göndərildi!</h3>
                    <p className="text-on-surface-variant text-sm">24 saat ərzində sizinlə əlaqə saxlayacağıq.</p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-primary font-headline">Mesaj göndər</h2>
                      <p className="text-on-surface-variant text-sm mt-1">Formu doldurun, tezliklə cavab verəcəyik.</p>
                    </div>

                    {[
                      { id: "name",    label: "Ad Soyad", type: "text",  placeholder: "Adınızı daxil edin" },
                      { id: "email",   label: "E-poçt",   type: "email", placeholder: "email@nümunə.az" },
                      { id: "subject", label: "Mövzu",    type: "text",  placeholder: "Mesajınızın mövzusu" },
                    ].map(({ id, label, type, placeholder }) => (
                      <div key={id}>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">
                          {label}
                        </label>
                        <input
                          required
                          type={type}
                          value={form[id as keyof typeof form]}
                          onChange={handleChange(id as keyof typeof form)}
                          className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                          placeholder={placeholder}
                        />
                      </div>
                    ))}

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">
                        Mesaj
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={form.message}
                        onChange={handleChange("message")}
                        className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
                        placeholder="Mesajınızı yazın..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full editorial-gradient text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                      <Send size={17} />
                      Göndər
                    </button>
                  </motion.form>
                )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
