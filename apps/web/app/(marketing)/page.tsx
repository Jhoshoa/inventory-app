import type { Metadata } from "next";
import Link from "next/link";
import {
  FAQS,
  LANDING_FEATURES,
  LANDING_SEGMENTS,
  LANDING_STEPS,
  LANDING_TICKER,
  TRIAL_DAYS,
  type StickerTone,
} from "@/features/marketing/data";
import { BRAND, whatsappHref } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Sistema de inventario y ventas para negocios en Bolivia`,
  description: BRAND.description,
  alternates: { canonical: "/" },
};

const TONE_BG: Record<StickerTone, string> = {
  sun: "bg-mkt-sun",
  accent: "bg-mkt-accent",
  white: "bg-white",
};

const SECTION_TITLE = "font-display text-[clamp(34px,4.2vw,62px)] font-normal uppercase leading-none";
const PILL = "inline-block rounded-full border-2 font-bold no-underline transition-transform hover:-translate-y-0.5";

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-receipt text-[13px] font-bold uppercase tracking-[0.1em] ${className}`}>{children}</p>
  );
}

function ReceiptEdge({ className }: { className: string }) {
  return <div aria-hidden="true" className={`receipt-edge ${className}`} />;
}

function ReceiptLine({ item, amount }: { item: string; amount: string }) {
  return (
    <div className="flex gap-1.5">
      <span>{item}</span>
      <span aria-hidden="true" className="flex-1 -translate-y-[5px] border-b-2 border-dotted border-mkt-dots" />
      <span>{amount}</span>
    </div>
  );
}

function Hero() {
  return (
    <section className="bg-mkt-cobalt text-white">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-14 px-6 pb-20 pt-12 sm:pb-28 sm:pt-16">
        <div className="min-w-0 flex-[1_1_560px]">
          <p className="inline-block -rotate-2 bg-mkt-ink px-3 py-2 font-receipt text-[13px] uppercase tracking-[0.08em]">
            Hecho para negocios en Bolivia
          </p>
          <h1 className="mt-7 font-display text-[clamp(50px,6.6vw,104px)] font-normal uppercase leading-[0.9] tracking-[-0.02em]">
            La <span className="text-mkt-sun">amiga</span> que anota cada venta.
          </h1>
          <p className="mt-7 max-w-[540px] text-xl leading-[1.55] text-mkt-haze">
            Inventario, punto de venta y cierre de caja en un solo lugar. {BRAND.name} se acuerda de todo para que tú
            atiendas tranquilo.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/register"
              className={`${PILL} border-mkt-ink bg-mkt-sun px-7 py-[17px] text-[17px] text-mkt-ink shadow-[5px_5px_0_#111111]`}
            >
              Probar {TRIAL_DAYS} días gratis →
            </Link>
            <a href="#planes" className={`${PILL} border-white px-[26px] py-[17px] text-[17px] text-white`}>
              Ver precios
            </a>
          </div>
        </div>

        <div className="relative mx-auto h-[500px] w-full min-w-0 max-w-[460px] flex-[1_1_420px] sm:h-[560px]">
          <div aria-hidden="true" className="absolute left-[10%] top-10 h-[440px] w-[72%] -rotate-[10deg] bg-white opacity-[0.35]" />
          <div aria-hidden="true" className="absolute left-[20%] top-6 h-[440px] w-[72%] rotate-[7deg] bg-white opacity-[0.6]" />
          <figure aria-label="Ejemplo de boleta de venta" className="absolute left-[10%] top-16 m-0 w-[76%] -rotate-[1.5deg] sm:left-[14%] sm:top-5 sm:w-[72%]">
            <div className="bg-white px-[22px] pb-[18px] pt-7 font-receipt text-[13px] leading-[1.8] text-mkt-ink shadow-[0_30px_60px_rgba(0,0,0,0.25)]">
              <p className="text-center font-display text-lg uppercase">{BRAND.name}</p>
              <p className="text-center">VENTA N° 0142 · EJEMPLO</p>
              <div className="my-3 border-t-2 border-dashed border-mkt-ink" />
              <ReceiptLine item={'Clavos 2" × 1 kg'} amount="18,00" />
              <ReceiptLine item="Látex blanco 4L" amount="95,00" />
              <ReceiptLine item="Cinta aislante" amount="7,00" />
              <div className="my-3 border-t-2 border-dashed border-mkt-ink" />
              <div className="flex justify-between text-[17px] font-bold">
                <span>TOTAL</span>
                <span>Bs 120,00</span>
              </div>
              <ul className="mt-2.5 text-xs leading-[1.7]">
                <li>✓ Stock descontado</li>
                <li>✓ Venta en el reporte del día</li>
                <li>✓ Sumada a la caja</li>
              </ul>
            </div>
            <ReceiptEdge className="h-3.5 bg-white" />
          </figure>
          <div className="absolute -top-2 right-0 flex h-[100px] w-[100px] rotate-12 flex-col items-center justify-center rounded-full border-[3px] border-mkt-ink bg-mkt-sun text-center font-display leading-[0.95] text-mkt-ink sm:-right-3 sm:-top-4 sm:h-[150px] sm:w-[150px]">
            <span className="text-[30px] sm:text-[44px]">{TRIAL_DAYS}</span>
            <span className="text-[13px] sm:text-lg">
              DÍAS
              <br />
              GRATIS
            </span>
          </div>
          <div className="absolute bottom-5 left-0 -rotate-[8deg] border-[3px] border-mkt-ink bg-mkt-accent px-[18px] py-3 font-display text-lg uppercase text-mkt-ink">
            Sin tarjeta
          </div>
        </div>
      </div>
    </section>
  );
}

function Ticker() {
  const items = LANDING_TICKER.map((item) => `★ ${item}`).join("   ");
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden whitespace-nowrap border-y-[3px] border-mkt-ink bg-mkt-accent py-4 font-receipt text-[15px] font-bold uppercase tracking-[0.06em] text-mkt-ink"
    >
      {/* Dos copias: al desplazar -50% la segunda ocupa el lugar de la primera sin salto. */}
      <div className="flex w-max animate-ticker motion-reduce:animate-none">
        <span className="whitespace-pre pr-8">{items}</span>
        <span className="whitespace-pre pr-8">{items}</span>
      </div>
    </div>
  );
}

function Problem() {
  return (
    <section className="mx-auto max-w-[1240px] px-6 pb-20 pt-24 sm:pb-[104px] sm:pt-[120px]">
      <Eyebrow className="text-mkt-cobalt">El problema</Eyebrow>
      <h2 className="mt-4 font-display text-[clamp(44px,6.4vw,100px)] font-normal uppercase leading-[0.92]">
        ¿Cuánto vendiste ayer?
      </h2>
      <div className="mt-12 flex flex-wrap gap-6">
        <p className="-rotate-3 border-2 border-mkt-ink bg-mkt-sun px-7 py-6 font-display text-[28px] shadow-[6px_6px_0_#111111]">
          &ldquo;No sé.&rdquo;
        </p>
        <p className="rotate-2 border-2 border-mkt-ink bg-white px-7 py-6 font-display text-[28px] shadow-[6px_6px_0_#111111]">
          &ldquo;Más o menos…&rdquo;
        </p>
        <p className="-rotate-1 border-2 border-mkt-ink bg-mkt-accent px-7 py-6 font-display text-[28px] shadow-[6px_6px_0_#111111]">
          &ldquo;Déjame ver el cuaderno.&rdquo;
        </p>
      </div>
      <p className="mt-12 max-w-[660px] text-[21px] leading-[1.55] text-mkt-body">
        Cuadernos, hojas de cálculo sueltas y ventas sin registro hacen que pierdas tiempo y plata sin darte cuenta. Con{" "}
        {BRAND.name}, la respuesta está en tu celular.
      </p>
    </section>
  );
}

function Features() {
  return (
    <section id="funciones" className="scroll-mt-20 border-y-[3px] border-mkt-ink bg-mkt-cobalt text-white">
      <div className="mx-auto max-w-[1240px] px-6 py-20 sm:py-[104px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow className="text-mkt-sun">Funciones</Eyebrow>
            <h2 className={`mt-4 max-w-[760px] ${SECTION_TITLE}`}>Todo lo que tu mostrador necesita.</h2>
          </div>
          <Link href="/funcionalidades" className="py-3 text-base font-bold text-white underline underline-offset-4 hover:text-mkt-sun">
            Ver todas las funciones →
          </Link>
        </div>
        <div className="mt-14 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-x-6 gap-y-8">
          {LANDING_FEATURES.map((feature) => (
            <div key={feature.number} className="text-mkt-ink">
              <div className="relative min-h-[190px] bg-white px-[22px] pb-[22px] pt-7">
                <span
                  aria-hidden="true"
                  className={`absolute -top-[18px] right-3.5 flex h-[54px] w-[54px] rotate-[10deg] items-center justify-center rounded-full border-2 border-mkt-ink font-display text-lg ${TONE_BG[feature.tone]}`}
                >
                  {feature.number}
                </span>
                <h3 className="m-0 pr-12 font-display text-[21px] font-normal uppercase leading-[1.1]">{feature.title}</h3>
                <div className="my-3.5 border-t-2 border-dashed border-mkt-ink" />
                <p className="text-[15px] leading-[1.55] text-mkt-body">{feature.description}</p>
              </div>
              <ReceiptEdge className="h-3 bg-white" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Steps() {
  return (
    <section className="mx-auto max-w-[1240px] px-6 pb-16 pt-24 sm:pb-20 sm:pt-[120px]">
      <Eyebrow className="text-center text-mkt-cobalt">Así empiezas</Eyebrow>
      <h2 className={`mt-4 text-center ${SECTION_TITLE}`}>Tres pasos y ya vendes.</h2>
      <ol className="mt-16 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-12 p-0 text-center">
        {LANDING_STEPS.map((step) => (
          <li key={step.number} className="flex flex-col items-center">
            <span
              aria-hidden="true"
              className={`flex h-40 w-40 -rotate-6 items-center justify-center rounded-full border-[3px] border-mkt-ink font-display text-[80px] shadow-[6px_6px_0_#111111] ${TONE_BG[step.tone]}`}
            >
              {step.number}
            </span>
            <h3 className="mt-7 font-display text-2xl font-normal uppercase">
              <span className="sr-only">Paso {step.number}: </span>
              {step.title}
            </h3>
            <p className="mt-2.5 max-w-[300px] text-base leading-[1.55] text-mkt-body">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CashClose() {
  return (
    <section className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-16 px-6 pb-24 pt-16 sm:pb-[120px] sm:pt-20">
      <div className="min-w-0 flex-[1_1_480px]">
        <Eyebrow className="text-mkt-cobalt">Cierre de caja</Eyebrow>
        <h2 className={`mt-4 ${SECTION_TITLE}`}>Tu amiga cuenta contigo.</h2>
        <p className="mt-7 max-w-[520px] text-[19px] leading-[1.6] text-mkt-body">
          Al cerrar, {BRAND.name} compara lo que debería haber en caja con lo que contaste. Si falta algo, te avisa ese
          mismo día.
        </p>
      </div>
      <div className="relative mx-auto min-w-0 flex-[0_1_380px]">
        <div className="border-2 border-mkt-ink bg-white px-6 py-7 font-receipt text-[15px] leading-[2] shadow-[10px_10px_0_#1F3BFF]">
          <div className="flex justify-between font-bold">
            <span>CIERRE DE CAJA</span>
            <span className="text-xs text-mkt-muted">EJEMPLO</span>
          </div>
          <div className="my-2.5 border-t-2 border-dashed border-mkt-ink" />
          <div className="flex justify-between">
            <span>Esperado</span>
            <span>Bs 1.250,00</span>
          </div>
          <div className="flex justify-between">
            <span>Contado</span>
            <span>Bs 1.210,00</span>
          </div>
          <div className="my-2.5 border-t-2 border-dashed border-mkt-ink" />
          <div className="flex justify-between text-lg font-bold">
            <span>Diferencia</span>
            <span>−Bs 40,00</span>
          </div>
        </div>
        <div className="absolute -right-4 -top-7 flex h-28 w-28 rotate-[14deg] items-center justify-center rounded-full border-[3px] border-mkt-ink bg-mkt-accent text-center font-display text-[15px] leading-[1.05]">
          ¡TE
          <br />
          AVISA!
        </div>
      </div>
    </section>
  );
}

function Segments() {
  return (
    <section className="bg-mkt-ink text-white">
      <div className="mx-auto max-w-[1240px] px-6 py-20 sm:py-[104px]">
        <Eyebrow className="text-mkt-sun">Para quién es</Eyebrow>
        <h2 className={`mt-4 ${SECTION_TITLE}`}>Del minimarket a la distribuidora.</h2>
        <div className="mt-14 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
          {LANDING_SEGMENTS.map((segment) => (
            <div
              key={segment.number}
              className={`border-2 border-white p-8 text-mkt-ink ${TONE_BG[segment.tone]}`}
              style={{ transform: `rotate(${segment.tilt}deg)` }}
            >
              <p className="font-receipt text-[13px] font-bold">N° {segment.number}</p>
              <h3 className="mt-3.5 font-display text-[26px] font-normal uppercase">{segment.title}</h3>
              <p className="mt-3.5 text-base leading-[1.6]">{segment.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Plans() {
  return (
    <section id="planes" className="mx-auto max-w-[1240px] scroll-mt-20 px-6 py-24 sm:py-[120px]">
      <Eyebrow className="text-center text-mkt-cobalt">Precios</Eyebrow>
      <h2 className={`mt-4 text-center ${SECTION_TITLE}`}>Precios de amiga.</h2>
      <div className="mt-16 flex flex-wrap items-start justify-center gap-10">
        <div className="relative min-w-0 flex-[0_1_360px]">
          <div className="border-2 border-b-0 border-mkt-ink bg-white px-7 pb-6 pt-8 font-receipt text-sm leading-[1.9]">
            <p className="font-bold">PRUEBA GRATIS</p>
            <p className="font-display text-[56px] leading-[1.1]">Bs 0</p>
            <p>por {TRIAL_DAYS} días</p>
            <div className="my-4 border-t-2 border-dashed border-mkt-ink" />
            <ul>
              <li>✓ Todas las funciones</li>
              <li>✓ Sin tarjeta de crédito</li>
              <li>✓ Cancela cuando quieras</li>
            </ul>
            <Link
              href="/register"
              className="mt-6 block rounded-full border-2 border-mkt-ink p-3.5 text-center font-archivo text-base font-bold text-mkt-ink no-underline hover:bg-mkt-sun"
            >
              Empezar prueba
            </Link>
          </div>
          <ReceiptEdge className="h-3.5 bg-mkt-ink" />
        </div>

        <div className="relative min-w-0 flex-[0_1_360px]">
          <div className="absolute -right-3 -top-[30px] z-[2] flex h-[100px] w-[100px] rotate-12 items-center justify-center rounded-full border-[3px] border-mkt-ink bg-mkt-sun text-center font-display text-sm leading-[1.05] sm:-right-5">
            {TRIAL_DAYS} DÍAS
            <br />
            GRATIS
          </div>
          <div className="border-2 border-b-0 border-mkt-ink bg-mkt-cobalt px-7 pb-6 pt-8 font-receipt text-sm leading-[1.9] text-white">
            <p className="font-bold">PLAN NEGOCIO</p>
            <p className="font-display text-[44px] leading-[1.2]">A tu medida</p>
            <p>según usuarios y sucursales</p>
            <div className="my-4 border-t-2 border-dashed border-white" />
            <ul>
              <li>✓ Todo lo de la prueba</li>
              <li>✓ Cotización en minutos</li>
              <li>✓ Soporte por WhatsApp</li>
            </ul>
            <a
              href={whatsappHref(`Hola, quiero una cotización de ${BRAND.name} para mi negocio`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 block rounded-full border-2 border-mkt-ink bg-mkt-sun p-3.5 text-center font-archivo text-base font-bold text-mkt-ink no-underline"
            >
              Pedir cotización
            </a>
          </div>
          <ReceiptEdge className="h-3.5 bg-mkt-ink" />
        </div>
      </div>
      <p className="mt-10 text-center text-base">
        <Link href="/precios" className="font-bold text-mkt-ink underline underline-offset-4 hover:text-mkt-cobalt">
          Ver qué incluye el plan →
        </Link>
      </p>
    </section>
  );
}

function Faq() {
  return (
    <section className="mx-auto max-w-[900px] px-6 pb-24 sm:pb-[120px]">
      <h2 className={`mb-10 text-center ${SECTION_TITLE}`}>Pregúntale a tu amiga</h2>
      <div className="flex flex-col gap-3">
        {FAQS.map((faq) => (
          <details key={faq.question} className="marketing-details group border-2 border-mkt-ink bg-white px-6 py-5">
            <summary className="flex cursor-pointer list-none justify-between gap-4 text-lg font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-mkt-cobalt">
              {faq.question}
              <span
                aria-hidden="true"
                className="font-display text-mkt-cobalt transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-base leading-[1.6] text-mkt-body">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t-[3px] border-mkt-ink bg-mkt-accent text-mkt-ink">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-10 px-6 py-20 sm:py-[104px]">
        <div className="min-w-0 flex-[1_1_560px]">
          <h2 className="font-display text-[clamp(42px,5.6vw,84px)] font-normal uppercase leading-[0.92]">
            Tu nueva amiga del mostrador.
          </h2>
          <p className="mt-5 text-xl leading-normal">
            Crea tu cuenta y prueba {BRAND.name} {TRIAL_DAYS} días, sin compromiso.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/register" className={`${PILL} border-mkt-ink bg-mkt-ink px-[30px] py-4 text-[17px] text-white`}>
            Probar gratis
          </Link>
          <Link href="/contacto" className={`${PILL} border-mkt-ink px-7 py-4 text-[17px] text-mkt-ink`}>
            Hablar con ventas
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function MarketingHomePage() {
  return (
    <>
      <Hero />
      <Ticker />
      <Problem />
      <Features />
      <Steps />
      <CashClose />
      <Segments />
      <Plans />
      <Faq />
      <FinalCta />
    </>
  );
}
