import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { AtomLogo } from "./AtomLogo";
import { Eyebrow } from "./ui";

export function PhilosophySection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="overflow-hidden bg-black px-6 py-28 md:py-40">
      <div ref={ref} className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="hero-title mb-16 font-display text-5xl font-medium text-white md:mb-24 md:text-7xl lg:text-8xl"
        >
          Administración <span className="text-nucleo-flame">×</span> Comunidad
        </motion.h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl bg-nucleo-carbon"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(252,76,2,0.08),_transparent_60%)]" />
            <AtomLogo size={170} className="opacity-90 drop-shadow-[0_0_18px_rgba(252,76,2,0.2)]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="flex flex-col justify-center"
          >
            <div>
              <Eyebrow>Opera tu gimnasio</Eyebrow>
              <p className="mt-4 text-base leading-relaxed text-white/70 md:text-lg">
                Membresías, planes, cuotas personalizadas, pagos con tarjeta y manuales con
                conciliación, clases, reservas y check-in. Todo tu negocio en un solo lugar, sin
                importar cómo entró el dinero.
              </p>
            </div>

            <div className="my-8 h-px w-full bg-white/10" />

            <div>
              <Eyebrow>Retén y haz crecer</Eyebrow>
              <p className="mt-4 text-base leading-relaxed text-white/70 md:text-lg">
                El atleta conserva una identidad portátil —su Athlete Passport— a través de cada
                gimnasio y club. Gamificación, drop-ins entre boxes y comunidades convierten
                gimnasios aislados en una red que crece sola.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
