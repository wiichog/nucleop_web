import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { LayoutDashboard, HeartPulse, Share2 } from "lucide-react";
import { Eyebrow } from "./ui";

const MOTORES = [
  {
    tag: "Operación",
    title: "Administración y cobro",
    description:
      "Atletas, membresías, planes y cuotas, pagos con tarjeta o manuales, clases y check-in. El panel donde el dueño opera su gimnasio completo.",
    Icon: LayoutDashboard,
    color: "#FC4C02",
  },
  {
    tag: "Comunidad",
    title: "Retención y comunidad",
    description:
      "Puntos, badges, rachas, PRs y alertas de riesgo de abandono. El gancho real: dejar de perder alumnos, no solo cobrar mejor.",
    Icon: HeartPulse,
    color: "#FF2D55",
  },
  {
    tag: "Red",
    title: "Red y crecimiento",
    description:
      "Athlete Passport portátil, drop-ins entre boxes, clubes deportivos y marketplace. Gimnasios aislados se vuelven una red con efecto de red.",
    Icon: Share2,
    color: "#FF9F1C",
  },
];

export function ServicesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="servicios" className="relative overflow-hidden bg-black px-6 py-28 md:py-40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(252,76,2,0.10),_transparent_55%)]" />
      <div ref={ref} className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-12 flex flex-col gap-4 md:mb-16 md:flex-row md:items-end md:justify-between"
        >
          <h2 className="hero-title font-display text-4xl font-medium text-white md:text-6xl">
            Qué hacemos<span className="text-nucleo-flame">.</span>
          </h2>
          <Eyebrow>Tres motores · una red</Eyebrow>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {MOTORES.map((m, i) => (
            <motion.article
              key={m.title}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: i * 0.15 }}
              className="liquid-glass group overflow-hidden rounded-3xl"
            >
              <div className="relative flex aspect-video items-center justify-center overflow-hidden">
                <div
                  className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                  style={{
                    background: `radial-gradient(circle at 50% 60%, ${m.color}55, transparent 65%)`,
                  }}
                />
                {/* Índice + divisor diagonal (motivo stat del hero) */}
                <span className="absolute left-5 top-5 z-10 flex items-center gap-2">
                  <span className="font-display text-sm text-white/60">0{i + 1}</span>
                  <span aria-hidden className="h-px w-8 rotate-[20deg] bg-white/30" />
                </span>
                <m.Icon
                  size={56}
                  strokeWidth={1.3}
                  style={{ color: m.color, filter: `drop-shadow(0 0 16px ${m.color})` }}
                  className="relative z-10"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>

              <div className="p-6 md:p-8">
                <Eyebrow>{m.tag}</Eyebrow>
                <h3 className="mb-3 mt-4 font-display text-xl font-medium tracking-tight text-white md:text-2xl">
                  {m.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/50">{m.description}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
