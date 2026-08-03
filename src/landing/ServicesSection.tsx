import { ChevronRight } from "lucide-react";
import { AtomLogo } from "./AtomLogo";
import { BentoBar } from "./ui";
import { useReveal } from "./useReveal";

/**
 * "Plataforma" — los tres motores de Nucleo en un bento de tres columnas
 * (operación · retención · red). Columna central invertida en negro para anclar
 * la retícula; el único naranja es el cuadro del CTA.
 */
export function ServicesSection() {
  const { ref, visible } = useReveal<HTMLElement>(0.1);
  const show = (cls: string) => (visible ? cls : "");

  return (
    <section
      id="plataforma"
      data-nav-light
      ref={ref}
      className="min-h-screen w-full scroll-mt-20 bg-[#E8E5E9] p-2 sm:p-3 lg:h-screen"
    >
      <div className="grid h-full grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-3">
        {/* ── 01 · Operación ─────────────────────────────────────────── */}
        <div
          className={`min-h-[500px] overflow-hidden rounded-2xl bg-white opacity-0 lg:min-h-0 ${show(
            "animate-scale-in",
          )}`}
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex h-full flex-col justify-between p-5 sm:p-6">
            <div className={`opacity-0 ${show("animate-fade-up")}`} style={{ animationDelay: "0.3s" }}>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-black/40">
                Operación
              </p>
              <p className="hero-title mt-3 font-display text-5xl font-medium text-black/80 sm:text-6xl">
                01
              </p>
              <p className="mt-4 font-mono text-xs leading-relaxed text-black/70 sm:text-sm">
                Membresías, planes, cuotas, cobros con tarjeta o manuales, clases, reservas y
                check-in. El panel donde se opera el gimnasio completo.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div
                className={`opacity-0 ${show("animate-fade-up")}`}
                style={{ animationDelay: "0.45s" }}
              >
                <BentoBar href="#funciones">De hojas sueltas a un solo sistema</BentoBar>
              </div>

              <div className="grid grid-cols-5 gap-2">
                <div
                  className={`col-span-3 flex flex-col justify-between rounded-xl bg-[#EBE8EB] p-4 opacity-0 ${show(
                    "animate-fade-up",
                  )}`}
                  style={{ animationDelay: "0.55s" }}
                >
                  <p className="font-mono text-xs leading-relaxed text-black/70 sm:text-sm">
                    Lo difícil no es cobrar: es saber quién viene, quién debe y quién está por
                    irse.
                  </p>
                  {/* Escala por breakpoint: en la retícula de 3 columnas la
                      tarjeta es angosta y la palabra no cabe a 60px. */}
                  <p className="hero-title mt-3 font-display text-5xl font-medium text-black lg:text-4xl xl:text-5xl 2xl:text-6xl">
                    Opera
                  </p>
                </div>
                <div
                  className={`col-span-2 flex flex-col items-end justify-end rounded-xl bg-[#EBE8EB] p-4 opacity-0 ${show(
                    "animate-fade-up",
                  )}`}
                  style={{ animationDelay: "0.65s" }}
                >
                  <p className="hero-title font-display text-4xl font-medium text-black lg:text-2xl xl:text-3xl 2xl:text-4xl">
                    GT/01
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 02 · Retención (columna invertida) ─────────────────────── */}
        <div
          className={`min-h-[500px] overflow-hidden rounded-2xl bg-nucleo-ink opacity-0 lg:min-h-0 ${show(
            "animate-scale-in",
          )}`}
          style={{ animationDelay: "0.25s" }}
        >
          <div className="flex h-full flex-col justify-between p-6 sm:p-8">
            <div
              className={`opacity-0 ${show("animate-fade-up")}`}
              style={{ animationDelay: "0.45s" }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">
                Retención
              </p>
              <p className="mt-4 font-mono text-xs leading-relaxed text-white/70 sm:text-sm">
                Puntos, rachas, badges, PRs, leaderboards y atleta del mes: la comunidad que
                convierte volver al box en un hábito, no en una decisión.
              </p>
              <p className="mt-4 font-mono text-xs leading-relaxed text-white/70 sm:text-sm">
                Nucleo detecta al alumno que se está apagando antes de que pida la baja y te avisa
                a tiempo para recuperarlo.
              </p>
              <p className="hero-title mt-8 font-display text-5xl font-medium text-white sm:text-6xl">
                02
              </p>
            </div>

            <div
              className={`opacity-0 ${show("animate-fade-up")}`}
              style={{ animationDelay: "0.6s" }}
            >
              <a
                href="#retencion"
                aria-label="Ver cómo funciona la retención"
                className="group inline-flex h-12 w-12 items-center justify-center rounded-xl bg-nucleo-flame"
              >
                <ChevronRight className="h-5 w-5 text-white transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>

        {/* ── 03 · Red ───────────────────────────────────────────────── */}
        <div
          className={`flex min-h-[500px] flex-col gap-2 rounded-2xl bg-white p-2 opacity-0 sm:gap-3 sm:p-3 lg:min-h-0 ${show(
            "animate-scale-in",
          )}`}
          style={{ animationDelay: "0.4s" }}
        >
          <div className="flex flex-1 flex-col gap-2">
            <div
              className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-nucleo-ink opacity-0 ${show(
                "animate-fade-in",
              )}`}
              style={{ animationDelay: "0.55s" }}
            >
              <AtomLogo size={132} className="opacity-90" />
              <p className="absolute bottom-4 left-4 font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">
                Athlete Passport
              </p>
            </div>

            <div
              className={`opacity-0 ${show("animate-fade-up")}`}
              style={{ animationDelay: "0.65s" }}
            >
              <BentoBar href="#funciones">Una identidad, todos sus gimnasios</BentoBar>
            </div>
          </div>

          <div
            className={`flex flex-1 flex-col justify-end rounded-xl bg-[#EBE8EB] p-5 opacity-0 sm:p-6 ${show(
              "animate-fade-up",
            )}`}
            style={{ animationDelay: "0.75s" }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-black/40">Red</p>
            <p className="hero-title mt-3 font-display text-5xl font-medium text-black sm:text-6xl">
              03
            </p>
            <p className="mt-2 font-display text-xl font-medium leading-snug text-black sm:text-2xl">
              Drop-ins, clubes y tienda entre boxes
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
