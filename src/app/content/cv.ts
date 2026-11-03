/**
 * Contenido del CV en un solo lugar: las secciones solo lo pintan.
 * (Si algún día hay versión en inglés, este es el archivo que se duplica.)
 */

export interface Role {
  period: string;
  title: string;
  company: string;
  points: string[];
  stack: string[];
}

export interface StackGroup {
  name: string;
  items: string[];
}

export interface Entry {
  title: string;
  detail: string;
}

export const ROLES: Role[] = [
  {
    period: 'Mayo 2025 – hoy',
    title: 'Full Stack Developer',
    company: 'Terra Energy',
    points: [
      'Diseñé desde cero la arquitectura serverless de Aurora, la nueva plataforma interna (~180 usuarios internos y ~4,500 clientes): Lambda con arquitectura hexagonal, API Gateway, Cognito, S3 y RDS. Migré la operación desde un monolito PHP/MySQL.',
      'Implementé la IA como metodología de desarrollo del equipo, con normativa de uso, agentes y subagentes. Los ciclos de desarrollo pasaron de ~2 meses a ~1 semana.',
      'Infraestructura como código con CloudFormation sobre AWS Organizations y CI/CD con GitHub Actions: despliegues de ~10 minutos y cero incidentes en producción.',
      'Desarrollé el sitio corporativo terraenergy.mx en Angular y lo puse en producción sobre AWS.',
    ],
    stack: ['Lambda · hexagonal', 'API Gateway', 'Cognito', 'S3', 'RDS', 'CloudFormation', 'GitHub Actions', 'Angular'],
  },
  {
    period: 'Octubre 2021 – abril 2025',
    title: 'Full Stack Developer',
    company: 'Ix Agency',
    points: [
      'Aplicación de escritorio y web para visualizar tableros de QlikView en Grupo Financiero Banorte, con Electron, Spring Boot, Angular 19 y MySQL.',
      'Aplicaciones web en AngularJS y Angular 12+ para Banorte y la Universidad Iberoamericana.',
      'Aplicaciones de escritorio en Java para Scotiabank y APIs RESTful con Spring Boot.',
      'Funciones serverless en AWS Lambda con TypeScript bajo Clean Architecture, aprovisionadas con el AWS SDK.',
    ],
    stack: ['Angular', 'AngularJS', 'Electron', 'Spring Boot', 'Java', 'MySQL', 'AWS Lambda', 'TypeScript'],
  },
  {
    period: 'Noviembre 2020 – agosto 2022',
    title: 'Director de Proyectos de TI (freelance)',
    company: 'The Disruptor Agency',
    points: [
      'Coordiné equipos de front-end en aplicaciones y sitios para Adidas, YouTube y Bitso.',
      'Planeé las fases de cada proyecto y di seguimiento a su rendimiento.',
    ],
    stack: [],
  },
  {
    period: 'Agosto 2018 – agosto 2019',
    title: 'Frontend Web Developer',
    company: 'INFO 100',
    points: ['Interfaces responsivas con HTML, CSS y JavaScript, en colaboración directa con el equipo de back-end.'],
    stack: ['HTML', 'CSS', 'JavaScript'],
  },
];

export const STACK: StackGroup[] = [
  {
    name: 'Nube (AWS)',
    items: ['Lambda', 'API Gateway', 'Cognito', 'S3', 'RDS', 'Aurora', 'DynamoDB', 'EC2', 'ECS', 'EKS', 'CloudFormation', 'Organizations'],
  },
  { name: 'Arquitectura', items: ['Serverless', 'Hexagonal', 'Clean Architecture', 'Infraestructura como código'] },
  { name: 'CI/CD y DevOps', items: ['GitHub Actions', 'Docker', 'Kubernetes', 'Git', 'GitHub', 'GitLab', 'Bitbucket'] },
  { name: 'IA en el desarrollo', items: ['Claude', 'Kiro', 'Agentes y subagentes', 'Gestión de contexto', 'Normativa de uso'] },
  { name: 'Frontend', items: ['Angular y AngularJS', 'Ionic', 'React', 'TypeScript', 'Tailwind'] },
  { name: 'Backend y datos', items: ['Node.js', 'PHP', 'Java', 'C#', 'APIs RESTful', 'MySQL', 'SQL Server', 'MongoDB'] },
];

export const CERTIFICATIONS: string[] = [
  'AWS Certified Cloud Practitioner',
  'AWS Partner: Technical Accredited',
  'Scrum Foundation Professional (SFPC)',
];

export const EDUCATION: Entry[] = [
  { title: 'Ingeniería en Software y Redes', detail: 'Universidad Tecnológica de México, 2025' },
  { title: 'Técnico en Programación', detail: 'CECyT N.º 9, IPN, 2019' },
];

export const LANGUAGES: Entry[] = [
  { title: 'Español', detail: 'nativo' },
  { title: 'Inglés', detail: 'avanzado (B2)' },
];

export const CONTACT = {
  email: 'contacto@victormorales.dev',
  linkedin: 'https://www.linkedin.com/in/victor-hg/',
};
