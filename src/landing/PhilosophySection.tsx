import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { AtomLogo } from "./AtomLogo";
import { NeonBackground } from "./NeonBackground";

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
          className="mb-16 font-display text-5xl font-semibold tracking-tight text-white md:mb-24 md:text-7xl lg:text-8xl"
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
            <NeonBackground variant="section" />
            <AtomLogo size={170} className="opacity-80 drop-shadow-[0_0_22px_rgba(252,76,2,0.3)]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="flex flex-col justify-center"
          >
            <div>
              <p className="mb-4 text-xs uppercase tracking-widest text-white/40">
                Opera tu gimnasio
              </p>
              <p className="text-base leading-relaxed text-white/70 md:text-lg">
                Membresías, planes, cuotas personalizadas, pagos con tarjeta y manuales con
                conciliación, clases, reservas y check-in. Todo tu negocio en un solo lugar, sin
                importar cómo entró el dinero.
              </p>
            </div>

            <div className="my-8 h-px w-full neon-divider" />

            <div>
              <p className="mb-4 text-xs uppercase tracking-widest text-white/40">
                Retén y haz crecer
              </p>
              <p className="text-base leading-relaxed text-white/70 md:text-lg">
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
