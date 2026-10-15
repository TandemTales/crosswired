import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||4187);
const allowed=new Set(['/','/index.html','/style.css','/app.js','/engine.js','/favicon.svg']);
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(!allowed.has(url.pathname)){res.writeHead(404);res.end('Not found');return;}
  try {const file=url.pathname==='/'?'index.html':url.pathname.slice(1);const body=await readFile(path.join(root,file));res.writeHead(200,{'Content-Type':mime[path.extname(file)]+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);}
  catch {res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Crosswired: http://127.0.0.1:${port}`));
