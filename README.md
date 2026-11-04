# victormorales.dev

Sitio personal en Angular 22 (standalone, signals, sin zone.js) con prerender estático.
Se sirve desde S3 privado + CloudFront: no necesita servidor.

## Comandos

```bash
npm start            # desarrollo en http://localhost:4200
npm run build        # prerender a dist/victormorales-dev/browser
npm run serve:dist   # sirve el build como S3 + CloudFront en http://localhost:4300
```

En local la escena corre en **modo demo** (no hay cabeceras de CloudFront que leer).
Agrega `?cache=miss` a la URL para ver el recorrido cuando el edge va hasta S3.

## Estructura

```
src/app/
  app.*                  nav, footer y <router-outlet>
  pages/home.ts          página de inicio: hero 3D y, al hacer scroll, el CV
  hero/hero.*            texto, escena 3D y etiquetas de cada servicio
  hero/trace.*           píldora con el detalle del recorrido
  content/cv.ts          contenido del CV (experiencia, stack, formación, contacto)
  sections/*             experiencia, stack, formación y contacto
infra/github-deploy-role.yml   rol OIDC para GitHub Actions (CloudFormation)
.github/workflows/deploy.yml   build en PRs, deploy en main
  journey/journey.ts         lectura de tiempos y cabeceras (funciones puras)
  journey/journey-store.ts   estado de la interfaz con signals
  journey/journey-scene.ts   escena Three.js + línea de tiempo (carga diferida)
```

`journey-scene.ts` se importa con `import()` dentro de `afterNextRender`: Three.js no entra
en el bundle inicial y nunca corre durante el prerender.

## Despliegue

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) compila en cada PR y, en cada push a `main`,
publica el build en S3 e invalida CloudFront. Las credenciales llegan por OIDC: no hay llaves de AWS en GitHub.

El build recibe el commit, el número de run y la hora (`ng build --define DEPLOY_SHA=… DEPLOY_RUN=… DEPLOY_AT=…`);
el hero los muestra en el acto del deploy (GitHub → Actions → S3). En local no existen y salen datos de ejemplo.

| Archivos | Cache-Control | Por qué |
|---|---|---|
| JS/CSS con hash | `max-age=31536000, immutable` | Cambian de nombre en cada build |
| HTML y favicon | `max-age=0, s-maxage=86400` | El navegador revalida en cada visita (la escena mide un viaje real) y el edge lo guarda un día (HIT) |

> **Ojo:** el paso de limpieza usa `--delete`. Todo lo que esté en el bucket y no venga en el build se borra.
> Si hoy guardas ahí algo más (un PDF, imágenes), muévelo a `public/` antes del primer deploy.

### Primera vez

1. Crea el rol que asume GitHub Actions (permisos mínimos: escribir en el bucket e invalidar esa distribución):

   ```bash
   aws cloudformation deploy \
     --template-file infra/github-deploy-role.yml \
     --stack-name victormorales-dev-deploy-role \
     --capabilities CAPABILITY_NAMED_IAM \
     --parameter-overrides BucketName=victormorales.dev DistributionId=ECPYZEUCX62R6 CreateOidcProvider=true
   ```

   El template ya apunta a [`Vicnow/victormorales.dev`](https://github.com/Vicnow/victormorales.dev)
   (`GitHubOwner`, `GitHubRepo` y sus IDs numéricos por defecto). GitHub firma el token con
   `repo:Vicnow@36490268/victormorales.dev@1443640213:environment:production`; el rol acepta ese formato
   y el clásico sin IDs.

   > **Ojo:** en esta cuenta el stack fue quien creó el proveedor OIDC. Repite siempre
   > `CreateOidcProvider=true` al actualizarlo; con `false`, CloudFormation borraría el proveedor.

2. En GitHub, **Settings → Secrets and variables → Actions → Variables**, crea:

   | Variable | Valor |
   |---|---|
   | `AWS_ROLE_ARN` | `arn:aws:iam::976975817312:role/victormorales.dev-deploy` (output `RoleArn`) |
   | `AWS_REGION` | `us-east-1` |
   | `S3_BUCKET` | `victormorales.dev` |
   | `CLOUDFRONT_DISTRIBUTION_ID` | `ECPYZEUCX62R6` |

3. Haz push a `main`. El job `deploy` corre en el environment `production`: ahí puedes exigir aprobación manual si quieres.

### Manual (si algún día lo necesitas)

```bash
npm run build
aws s3 sync dist/victormorales-dev/browser s3://TU_BUCKET --exclude "*.html" --exclude "favicon.svg" --cache-control "public,max-age=31536000,immutable"
aws s3 sync dist/victormorales-dev/browser s3://TU_BUCKET --exclude "*" --include "*.html" --include "favicon.svg" --exclude "index.csr.html" --cache-control "public,max-age=0,s-maxage=86400,must-revalidate"
aws s3 sync dist/victormorales-dev/browser s3://TU_BUCKET --delete --exclude "index.csr.html"
aws cloudfront create-invalidation --distribution-id TU_DISTRIBUCION --paths "/*"
```

### Rutas nuevas (`/proyectos`, `/blog`…)

Con S3 privado vía OAC, CloudFront no resuelve `/proyectos` → `/proyectos/index.html`.
Asocia esta CloudFront Function (viewer request) al comportamiento por defecto:

```js
function handler(event) {
  var request = event.request;
  if (request.uri.endsWith('/')) request.uri += 'index.html';
  else if (!request.uri.includes('.')) request.uri += '/index.html';
  return request;
}
```

### Datos exactos de cada visita (opcional)

Activa las cabeceras **Server-Timing** en una política de cabeceras de respuesta de CloudFront.
Así el HIT/MISS que muestra la escena corresponde a la misma navegación; sin ellas se lee
de una petición `HEAD` aparte.

## Nota

La caché persistente del CLI está desactivada (`cli.cache.enabled: false` en `angular.json`)
porque hacía fallar a Node en el entorno donde se generó. Si en tu máquina compila bien,
puedes reactivarla con `npx ng cache enable`.
