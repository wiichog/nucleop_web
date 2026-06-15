import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ShoppingBag, Users, MapPin, Trophy, Dumbbell, CalendarCheck } from "lucide-react";
import { Eyebrow } from "./ui";

const FEATURES = [
  {
    Icon: ShoppingBag,
    title: "Marketplace",
    description:
      "Vende planes, productos y merch del gym con pago integrado y puntos por compra.",
  },
  {
    Icon: Users,
    title: "Comunidad y feed",
    description:
      "Anuncios, posts de atletas, reacciones y comentarios. Tu gimnasio vive más allá del WOD.",
  },
  {
    Icon: MapPin,
    title: "Drop-ins entre boxes",
    description:
      "Acceso temporal con QR para atletas de otros gimnasios de la red, sin fricción.",
  },
  {
    Icon: Trophy,
    title: "Clubes y retos",
    description:
      "Comunidades y retos entre boxes que encienden la competencia sana y la retención.",
  },
  {
    Icon: Dumbbell,
    title: "WODs, PRs y leaderboards",
    description:
      "Rutina del día, marcas personales y rankings que mantienen al atleta volviendo.",
  },
  {
    Icon: CalendarCheck,
    title: "Clases, reservas y check-in",
    description:
      "Horarios, reservas con lista de espera y check-in por QR al cierre de la clase.",
  },
];

export function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="funciones" className="relative overflow-hidden bg-black px-6 py-28 md:py-40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(252,76,2,0.05),_transparent_55%)]" />
      <div ref={ref} className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-12 flex flex-col gap-4 md:mb-16 md:flex-row md:items-end md:justify-between"
        >
          <h2 className="hero-title max-w-2xl font-display text-4xl font-medium text-white md:text-6xl">
            Mucho más que administrar<span className="text-nucleo-flame">.</span>
          </h2>
          <Eyebrow>Todo incluido</Eyebrow>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.04]"
            >
              <f.Icon
                size={22}
                strokeWidth={1.5}
                className="text-white/70 transition-colors duration-300 group-hover:text-nucleo-flame"
              />
              <h3 className="mb-2 mt-5 font-display text-lg font-medium tracking-tight text-white">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/50">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
