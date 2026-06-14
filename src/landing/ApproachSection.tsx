import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Eyebrow } from "./ui";
import { BRAND_VIDEO_URL } from "../lib/brand";

export function ApproachSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="overflow-hidden bg-black px-6 pb-20 pt-6 md:pb-32 md:pt-10">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
        className="relative mx-auto aspect-video max-w-6xl overflow-hidden rounded-3xl bg-nucleo-carbon"
      >
        {/* Mismo video del hero/logins → identidad coherente */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          src={BRAND_VIDEO_URL}
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

        {/* Contenido inferior */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between md:p-10">
          <div className="liquid-glass liquid-glass--core max-w-md rounded-2xl p-6 md:p-8">
            <Eyebrow>Nuestro enfoque</Eyebrow>
            <p className="mt-4 text-sm leading-relaxed text-white md:text-base">
              No vendemos un software de cobro: construimos retención. Puntos, rachas, PRs y
              alertas de riesgo para que cada gimnasio deje de perder alumnos y cada atleta
              encuentre su comunidad.
            </p>
          </div>
          <motion.a
            href="#servicios"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="liquid-glass inline-flex items-center gap-2 self-start rounded-full px-8 py-3 text-sm text-white md:self-auto"
          >
            Conoce cómo
            <ArrowUpRight size={16} />
          </motion.a>
        </div>
      </motion.div>
    </section>
  );
}
