import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { LayoutDashboard, HeartPulse, Share2 } from "lucide-react";

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
    <section
      id="servicios"
      className="relative overflow-hidden bg-black px-6 py-28 md:py-40"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_60%)]" />
      <div ref={ref} className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-12 flex items-end justify-between md:mb-16"
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Qué hacemos
          </h2>
          <span className="hidden text-sm text-white/40 md:block">Tres motores, una red</span>
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
                <m.Icon
                  size={56}
                  strokeWidth={1.3}
                  style={{ color: m.color, filter: `drop-shadow(0 0 16px ${m.color})` }}
                  className="relative z-10"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>

              <div className="p-6 md:p-8">
                <span className="text-xs uppercase tracking-widest text-white/40">{m.tag}</span>
                <h3 className="mb-3 mt-3 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
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
