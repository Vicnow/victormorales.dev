// CloudFront Function (viewer request) victormorales-dev-url-rewrite.
// Con S3 privado vía OAC, CloudFront no resuelve /ruta → /ruta/index.html: lo hace esta función.
function handler(event) {
  var request = event.request;
  if (request.uri.endsWith('/')) request.uri += 'index.html';
  else if (!request.uri.includes('.')) request.uri += '/index.html';
  return request;
}
