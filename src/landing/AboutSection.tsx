import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Eyebrow, DiagonalDivider } from "./ui";

export function AboutSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-black px-6 pb-10 pt-32 md:pb-14 md:pt-44"
    >
      {/* Halo cálido apenas perceptible */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(252,76,2,0.05),_transparent_55%)]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <Eyebrow>Nosotros</Eyebrow>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="hero-title mt-8 font-display text-4xl font-medium text-white md:text-6xl lg:text-7xl"
        >
          La red que <span className="text-nucleo-flame">conecta</span> gimnasios, atletas y
          comunidades — para que ninguno{" "}
          <span className="text-nucleo-flame">pierda a su gente</span>
          <span className="text-nucleo-flame">.</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10 flex items-center gap-4"
        >
          <DiagonalDivider force />
          <span className="font-display text-sm tracking-wide text-white/50">
            Una identidad · todos sus gimnasios
          </span>
        </motion.div>
      </div>
    </section>
  );
}
