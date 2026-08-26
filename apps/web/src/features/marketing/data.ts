import {
  BadgeCheck,
  Boxes,
  CalendarClock,
  FileSpreadsheet,
  QrCode,
  Receipt,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";

export interface MarketingFeature {
  icon: typeof Boxes;
  title: string;
  description: string;
}

// Funcionalidades reales del producto, verificadas contra el codigo actual
// (apps/backend README y rutas de apps/web/app/(app)/dashboard). No listar
// nada que el producto no haga todavia.
export const FEATURES: MarketingFeature[] = [
  {
    icon: Boxes,
    title: "Control de inventario",
    description:
      "Registra productos, categorias, stock minimo y ajustes de inventario en tiempo real, con alertas cuando un producto esta por agotarse.",
  },
  {
    icon: ShoppingCart,
    title: "Punto de venta (POS)",
    description:
      "Registra ventas rapido desde el mostrador y descuenta el stock automaticamente, sin pasos manuales adicionales.",
  },
  {
    icon: Receipt,
    title: "Ventas y reportes",
    description:
      "Historial de ventas, reportes de ingresos y movimientos de stock para saber exactamente que esta pasando en tu negocio cada dia.",
  },
  {
    icon: CalendarClock,
    title: "Cierre de caja diario",
    description:
      "Abre y cierra caja con control de efectivo esperado vs. contado, para detectar diferencias antes de que se vuelvan un problema.",
  },
  {
    icon: QrCode,
    title: "Etiquetas y codigos QR",
    description: "Genera e imprime etiquetas con codigo QR por producto para agilizar el registro en el punto de venta.",
  },
  {
    icon: FileSpreadsheet,
    title: "Importacion masiva por CSV",
    description: "Carga tu catalogo completo de productos desde una planilla en minutos, sin cargar uno por uno.",
  },
  {
    icon: ShieldCheck,
    title: "Roles y permisos",
    description: "Diferencia entre el rol de dueno y el de cajero, para que cada persona vea solo lo que necesita operar.",
  },
  {
    icon: BadgeCheck,
    title: "Tipo de cambio integrado",
    description:
      "Registra tipo de cambio (oficial BCB y paralelo) para negocios que manejan precios en bolivianos y dolares.",
  },
];

export interface MarketingSegment {
  title: string;
  description: string;
}

export const SEGMENTS: MarketingSegment[] = [
  {
    title: "Tiendas y minimarkets",
    description: "Controla decenas o cientos de productos sin depender de cuadernos ni hojas de calculo sueltas.",
  },
  {
    title: "Ferreterias",
    description: "Maneja catalogos grandes y variados con categorias, SKU y stock minimo por producto.",
  },
  {
    title: "Almacenes y distribuidoras",
    description: "Lleva el control de entradas, salidas y ventas con reportes claros para tomar decisiones.",
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

// Preguntas frecuentes: honestas sobre el estado actual del producto. No
// prometer funcionalidad que todavia no existe (ej. modo sin conexion, ver
// docs/mejoras/04-offline-first-pwa.md).
export const FAQS: FaqItem[] = [
  {
    question: "Cuanto cuesta el sistema?",
    answer:
      "El precio depende del tamano de tu negocio. Escribenos por WhatsApp y te damos una cotizacion en minutos. Todos los planes incluyen una prueba gratuita.",
  },
  {
    question: "Cuanto tiempo toma empezar a usarlo?",
    answer:
      "Puedes crear tu cuenta y empezar a cargar productos el mismo dia. Si tienes un catalogo grande, la importacion por CSV lo hace mas rapido.",
  },
  {
    question: "Funciona sin conexion a internet?",
    answer:
      "Hoy la plataforma funciona con conexion a internet estable. Estamos trabajando en soporte para ventas sin conexion, pensado para negocios con internet inestable.",
  },
  {
    question: "Puedo migrar mis productos actuales?",
    answer:
      "Si. Puedes importar tu catalogo completo desde un archivo CSV en la seccion de productos, sin cargar cada producto manualmente.",
  },
  {
    question: "Que tan seguro es mi informacion?",
    answer:
      "Cada tienda tiene su informacion completamente separada de las demas. El acceso requiere inicio de sesion y los datos se respaldan en una base de datos administrada.",
  },
  {
    question: "Ofrecen soporte si tengo problemas?",
    answer: "Si, puedes escribirnos directamente por WhatsApp y te ayudamos a resolver cualquier duda o problema.",
  },
];

export const TRIAL_DAYS = 30;
