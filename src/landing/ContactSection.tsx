import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Phone, Mail, ArrowRight } from "lucide-react";
import { AtomLogo } from "./AtomLogo";
import { NeonBackground } from "./NeonBackground";

export function ContactSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="contacto" className="relative overflow-hidden bg-black px-6 pb-12 pt-28 md:pt-40">
      <NeonBackground variant="section" />
      <div ref={ref} className="relative z-10 mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className="font-display text-5xl font-semibold tracking-tight text-white md:text-7xl">
            Lleva tu gimnasio <span className="text-nucleo-flame">a la red</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/60">
            Escríbenos para una demo o entra directo al panel de administración.
          </p>

          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-nucleo-flame px-8 py-3 text-sm font-bold uppercase tracking-wide text-white transition-transform hover:scale-105"
          >
            Portal Admin
            <ArrowRight size={16} />
          </Link>
        </motion.div>

        {/* Datos de contacto */}
        <div className="mx-auto mt-14 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href="tel:+50249740808"
            className="liquid-glass flex items-center gap-4 rounded-2xl px-6 py-5 text-white transition-colors hover:bg-white/5"
          >
            <span className="liquid-glass rounded-full p-3 text-nucleo-flame">
              <Phone size={20} />
            </span>
            <span>
              <span className="block text-xs uppercase tracking-widest text-white/40">Teléfono</span>
              <span className="text-sm font-medium">+502 4974 0808</span>
            </span>
          </a>
          <a
            href="mailto:jgarcia@devpackgroup.com"
            className="liquid-glass flex items-center gap-4 rounded-2xl px-6 py-5 text-white transition-colors hover:bg-white/5"
          >
            <span className="liquid-glass rounded-full p-3 text-nucleo-coral">
              <Mail size={20} />
            </span>
            <span>
              <span className="block text-xs uppercase tracking-widest text-white/40">Correo</span>
              <span className="text-sm font-medium">jgarcia@devpackgroup.com</span>
            </span>
          </a>
        </div>

        {/* Pie */}
        <div className="mt-20 flex flex-col items-center gap-4 border-t border-white/10 pt-10 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <AtomLogo size={26} />
            <span className="font-display text-lg font-bold tracking-tight text-white">Nucleo</span>
          </div>
          <span className="text-xs text-white/40">El núcleo de tu vida deportiva.</span>
        </div>
        <p className="mt-8 text-center text-xs text-white/30">
          © {new Date().getFullYear()} Nucleo · Devpack Group. Todos los derechos reservados.
        </p>
      </div>
    </section>
  );
}
