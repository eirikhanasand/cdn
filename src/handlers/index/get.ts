import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function getIndex(_req: FastifyRequest, res: FastifyReply) {
    return res.type('text/html').send(`<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Hanasand CDN</title>
<style>body{font:16px system-ui;background:#0b1220;color:#eef2ff;display:grid;min-height:100vh;margin:0;place-items:center}
main{max-width:36rem;padding:2rem}
h1{font-size:2.5rem}
p{color:#b8c5d9;line-height:1.6}
a{display:inline-block;padding:.8rem 1.2rem;
margin:.5rem .5rem 0 0;border:1px solid #637daa;border-radius:.6rem;color:inherit;text-decoration:none}
a:hover{background:#23334d}</style>
<main>
<h1>Hanasand CDN</h1>
<p>Upload files, browse your library, and share links.</p>
<a href="https://hanasand.com/gallery">Open library</a>
<a href="https://hanasand.com/upload">Upload a file</a>
</main>
</html>`)
}
