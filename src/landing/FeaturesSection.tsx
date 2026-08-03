import { ShoppingBag, Users, MapPin, Trophy, Dumbbell, CalendarCheck } from "lucide-react";
import { Eyebrow } from "./ui";
import { useReveal } from "./useReveal";

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

/** "Funciones" — retícula de capacidades sobre negro plano, sin halos. */
export function FeaturesSection() {
  const { ref, visible } = useReveal<HTMLElement>(0.1);
  const show = (cls: string) => (visible ? cls : "");

  return (
    <section
      id="funciones"
      ref={ref}
      className="relative w-full scroll-mt-20 overflow-hidden bg-black px-4 py-24 sm:px-6 md:py-36 lg:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <div
          className={`mb-12 flex flex-col gap-4 opacity-0 md:mb-16 md:flex-row md:items-end md:justify-between ${show(
            "animate-fade-up",
          )}`}
          style={{ animationDelay: "0.1s" }}
        >
          <h2 className="hero-title max-w-2xl font-display text-3xl font-medium text-white sm:text-5xl">
            Mucho más que administrar<span className="text-nucleo-flame">.</span>
          </h2>
          <Eyebrow>Todo incluido</Eyebrow>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`group rounded-2xl border border-white/10 bg-white/[0.02] p-6 opacity-0 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.04] ${show(
                "animate-fade-up",
              )}`}
              style={{ animationDelay: `${0.2 + i * 0.08}s` }}
            >
              <div className="flex items-start justify-between">
                <f.Icon
                  size={22}
                  strokeWidth={1.5}
                  className="text-white/70 transition-colors duration-300 group-hover:text-nucleo-flame"
                />
                <span className="font-mono text-[11px] tracking-[0.2em] text-white/25">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mb-2 mt-6 font-display text-lg font-medium tracking-tight text-white">
                {f.title}
              </h3>
              <p className="font-mono text-xs leading-relaxed text-white/50">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
