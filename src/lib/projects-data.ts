export interface Project {
  slug: string;
  name: string;
  description: string;
  longDescription?: string;
  imageUrl: string;
  dataAiHint: string;
  category?: string;
  featured?: boolean;
}

export const projectsData: Project[] = [
  {
    slug: "microrredes",
    name: "Microrredes",
    description: "Soluciones energéticas sostenibles para comunidades aisladas.",
    longDescription: "Este proyecto se enfoca en el diseño e implementación de microrredes eléctricas utilizando fuentes de energía renovable para proveer electricidad confiable y sostenible a comunidades remotas o aisladas, mejorando su calidad de vida y fomentando el desarrollo local.",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "microgrid energy",
    category: "Tecnología",
    featured: true,
  },
  {
    slug: "educacionespecial",
    name: "Educación Especial",
    description: "Herramientas tecnológicas para la inclusión y el aprendizaje adaptado.",
    longDescription: "Desarrollo de recursos y herramientas tecnológicas innovadoras para apoyar los procesos de enseñanza y aprendizaje de estudiantes con necesidades educativas especiales, promoviendo la inclusión y la equidad en el ámbito educativo.",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "special education",
    category: "Educación",
    featured: true,
  },
  {
    slug: "robotikids",
    name: "Robotikids",
    description: "Iniciación a la robótica y programación para niños y niñas.",
    longDescription: "Programa lúdico y educativo que introduce a niños y niñas en el fascinante mundo de la robótica y la programación a través de talleres prácticos y divertidos, fomentando el pensamiento computacional y la creatividad desde temprana edad.",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "kids robotics",
    category: "Educación",
    featured: true,
  },
  {
    slug: "reciclaje",
    name: "Reciclaje",
    description: "Fomento de la cultura del reciclaje mediante soluciones tecnológicas.",
    longDescription: "Iniciativas que combinan tecnología y concienciación para promover prácticas de reciclaje efectivas en la comunidad, buscando reducir el impacto ambiental y fomentar una economía circular.",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "recycling technology",
    category: "Sostenibilidad",
    featured: true,
  },
  {
    slug: "admision",
    name: "Admisión",
    description: "Sistema de apoyo para el proceso de admisión universitaria.",
    longDescription: "Desarrollo de una plataforma o herramientas para facilitar y optimizar el proceso de admisión a la universidad, tanto para aspirantes como para personal administrativo.",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "university admission",
    category: "Tecnología",
  },
  {
    slug: "businternogps",
    name: "Bus Interno GPS",
    description: "Sistema de seguimiento GPS para el transporte interno universitario.",
    longDescription: "Implementación de un sistema de geolocalización para las unidades de transporte interno de la universidad, permitiendo a los usuarios conocer en tiempo real la ubicación de los buses y optimizar sus tiempos de espera.",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "bus gps",
    category: "Tecnología",
  },
  {
    slug: "carritosmoviles",
    name: "Carritos Móviles",
    description: "Diseño y construcción de carritos móviles para fines educativos.",
    longDescription: "Creación de estaciones móviles o carritos equipados con tecnología y recursos educativos para llevar experiencias de aprendizaje interactivas a diferentes espacios dentro y fuera del campus.",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "mobile cart",
    category: "Educación",
  },
  {
    slug: "deferia",
    name: "DeFeria",
    description: "Plataforma de apoyo para ferias y eventos locales.",
    longDescription: "Desarrollo de una solución digital para facilitar la organización, promoción y participación en ferias y eventos comunitarios, conectando a productores, artesanos y público en general.",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "local fair",
    category: "Tecnología",
  },
  {
    slug: "facultadeducacion",
    name: "Facultad Educación",
    description: "Proyectos tecnológicos en colaboración con la Facultad de Educación.",
    longDescription: "Colaboración interdisciplinaria con la Facultad de Educación para desarrollar e implementar soluciones tecnológicas que aborden desafíos específicos en el ámbito educativo y pedagógico.",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "education faculty",
    category: "Educación",
  },
  {
    slug: "impresion3d",
    name: "Impresión 3D",
    description: "Aplicaciones de la impresión 3D en contextos educativos y sociales.",
    longDescription: "Exploración y desarrollo de proyectos que utilizan la tecnología de impresión 3D para crear prototipos, herramientas educativas, ayudas técnicas y soluciones innovadoras con impacto social.",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "3d printing",
    category: "Tecnología",
  },
  {
    slug: "pitaya",
    name: "Pitaya",
    description: "Investigación y desarrollo tecnológico aplicado al cultivo de pitaya.",
    longDescription: "Proyecto enfocado en la aplicación de tecnología para optimizar el cultivo, cosecha y postcosecha de la pitaya, buscando mejorar la productividad y sostenibilidad de este fruto tropical.",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "dragon fruit",
    category: "Sostenibilidad",
  },
  {
    slug: "prototiposeducativos",
    name: "Prototipos Educativos",
    description: "Creación de prototipos interactivos para la enseñanza y el aprendizaje.",
    longDescription: "Diseño y desarrollo de prototipos físicos y digitales con fines educativos, buscando crear herramientas interactivas y tangibles que faciliten la comprensión de conceptos complejos y mejoren la experiencia de aprendizaje.",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "educational prototype",
    category: "Educación",
  },
  {
    slug: "talleresdepython",
    name: "Talleres de Python",
    description: "Capacitación en programación con Python para la comunidad universitaria.",
    longDescription: "Oferta de talleres y cursos de programación en Python dirigidos a estudiantes y personal universitario, con el objetivo de desarrollar habilidades digitales y fomentar el uso de la programación como herramienta para la innovación.",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "python workshop",
    category: "Educación",
  },
];

export const getProjectBySlug = (slug: string): Project | undefined => {
  return projectsData.find(project => project.slug === slug);
};
