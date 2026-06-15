import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Eyebrow } from "./ui";

const MOTORES = [
  {
    tag: "Operación",
    title: "Administración y cobro",
    description:
      "Atletas, membresías, planes y cuotas, pagos con tarjeta o manuales, clases y check-in. El panel donde el dueño opera su gimnasio completo.",
    img: "/landing/service-operacion.jpg",
  },
  {
    tag: "Comunidad",
    title: "Retención y comunidad",
    description:
      "Puntos, badges, rachas, PRs y alertas de riesgo de abandono. El gancho real: dejar de perder alumnos, no solo cobrar mejor.",
    img: "/landing/service-comunidad.jpg",
  },
  {
    tag: "Red",
    title: "Red y crecimiento",
    description:
      "Athlete Passport portátil, drop-ins entre boxes, clubes deportivos y marketplace. Gimnasios aislados se vuelven una red con efecto de red.",
    img: "/landing/service-red.jpg",
  },
];

export function ServicesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="servicios" className="relative overflow-hidden bg-black px-6 py-28 md:py-40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(252,76,2,0.05),_transparent_55%)]" />
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
              className="liquid-glass group overflow-hidden rounded-3xl transition-transform duration-300 ease-out hover:-translate-y-1.5"
            >
              <div className="relative aspect-video overflow-hidden">
                {/* Foto (si falta el archivo, queda el fondo oscuro). Zoom al hover. */}
                <div
                  className="absolute inset-0 bg-nucleo-carbon bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
                  style={{ backgroundImage: `url('${m.img}')` }}
                />
                {/* Scrim para legibilidad del índice y fundido con la card */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/25" />
                {/* Velo flame que aparece al hover */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,_rgba(252,76,2,0.22),_transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                {/* Índice + divisor diagonal (motivo stat del hero) */}
                <span className="absolute left-5 top-5 z-10 flex items-center gap-2">
                  <span className="font-display text-sm text-white/70">0{i + 1}</span>
                  <span aria-hidden className="h-px w-8 rotate-[20deg] bg-white/40" />
                </span>
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
