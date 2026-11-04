/**
 * Ícono para cada herramienta del CV, por nombre tal como aparece en cv.ts.
 * - Marca: Simple Icons (CC0). Al pasar el mouse toman su color de marca.
 * - Genéricos: Lucide (ISC), para servicios de AWS (Amazon pidió retirarlos de
 *   Simple Icons), SQL Server, Kiro y conceptos de arquitectura e IA.
 * Una herramienta sin entrada aquí simplemente se muestra sin ícono.
 */
import {
  Bot, BrainCircuit, Building2, Cloud, CodeXml, Container, Database, DatabaseZap, FileCode2, Hexagon,
  KeyRound, Lambda, Layers, PaintBucket, ScrollText, Server, ShipWheel, Table2, Target, Waypoints, Webhook,
  type IconNode,
} from 'lucide';
import {
  siAngular, siBitbucket, siClaude, siCss, siDocker, siDotnet, siElectron, siGit, siGithub, siGithubactions,
  siGitlab, siHtml5, siIonic, siJavascript, siKubernetes, siMongodb, siMysql, siNodedotjs, siOpenjdk, siPhp,
  siReact, siSpringboot, siTailwindcss, siTypescript,
  type SimpleIcon,
} from 'simple-icons';

export interface IconData {
  /** Ícono de marca relleno (Simple Icons). */
  path?: string;
  /** Ícono de línea (Lucide). */
  nodes?: IconNode;
  /** Color de marca para el hover; null si sería ilegible sobre el fondo oscuro. */
  color: string | null;
}

// Luminancia relativa (WCAG): por debajo de ~0.1 el color de marca casi no se ve en el tema oscuro.
function luminance(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const brand = (icon: SimpleIcon): IconData => ({
  path: icon.path,
  color: luminance(icon.hex) >= 0.1 ? `#${icon.hex}` : null,
});
const line = (nodes: IconNode): IconData => ({ nodes, color: null });

export const TOOL_ICONS: Record<string, IconData> = {
  // Nube (AWS)
  'Lambda': line(Lambda),
  'AWS Lambda': line(Lambda),
  'Lambda · hexagonal': line(Lambda),
  'API Gateway': line(Waypoints),
  'Cognito': line(KeyRound),
  'S3': line(PaintBucket),
  'RDS': line(Database),
  'Aurora': line(DatabaseZap),
  'DynamoDB': line(Table2),
  'EC2': line(Server),
  'ECS': line(Container),
  'EKS': line(ShipWheel),
  'CloudFormation': line(Layers),
  'Organizations': line(Building2),

  // Arquitectura
  'Serverless': line(Cloud),
  'Hexagonal': line(Hexagon),
  'Clean Architecture': line(Target),
  'Infraestructura como código': line(FileCode2),

  // CI/CD y DevOps
  'GitHub Actions': brand(siGithubactions),
  'Docker': brand(siDocker),
  'Kubernetes': brand(siKubernetes),
  'Git': brand(siGit),
  'GitHub': brand(siGithub),
  'GitLab': brand(siGitlab),
  'Bitbucket': brand(siBitbucket),

  // IA en el desarrollo
  'Claude': brand(siClaude),
  'Kiro': line(CodeXml),
  'Agentes y subagentes': line(Bot),
  'Gestión de contexto': line(BrainCircuit),
  'Normativa de uso': line(ScrollText),

  // Frontend
  'Angular': brand(siAngular),
  'AngularJS': brand(siAngular),
  'Angular y AngularJS': brand(siAngular),
  'Ionic': brand(siIonic),
  'React': brand(siReact),
  'TypeScript': brand(siTypescript),
  'Tailwind': brand(siTailwindcss),
  'Electron': brand(siElectron),
  'HTML': brand(siHtml5),
  'CSS': brand(siCss),
  'JavaScript': brand(siJavascript),

  // Backend y datos
  'Node.js': brand(siNodedotjs),
  'PHP': brand(siPhp),
  'Java': brand(siOpenjdk),
  'C#': brand(siDotnet),
  'Spring Boot': brand(siSpringboot),
  'APIs RESTful': line(Webhook),
  'MySQL': brand(siMysql),
  'SQL Server': line(Database),
  'MongoDB': brand(siMongodb),
};
