import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { NeonBackground } from "./NeonBackground";

export function AboutSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-black px-6 pb-10 pt-32 md:pb-14 md:pt-44"
    >
      <NeonBackground variant="section" />
      <div className="relative z-10 mx-auto max-w-5xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-sm uppercase tracking-widest text-white/40"
        >
          Nosotros
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mt-6 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl"
        >
          La red que <span className="text-nucleo-flame">conecta</span> gimnasios, atletas y
          comunidades <br className="hidden md:block" /> para que ninguno{" "}
          <span className="text-nucleo-flame">pierda a su gente</span>.
        </motion.h2>
      </div>
    </section>
  );
}
