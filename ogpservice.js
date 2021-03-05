import { createApp } from "https://servestjs.org/@v1.1.9/mod.ts";

const resHTML = async (req, html) => {
  await req.respond({
    status: 200,
    headers: new Headers({ "Content-Type": "text/html" }),
    body: html,
  });
};
const resJSON = async (req, data) => {
  await req.respond({
    status: 200,
    headers: new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    }),
    body: JSON.stringify(data),
  });
};
const resText = async (req, text) => {
  await req.respond({
    status: 200,
    headers: new Headers({ "Content-Type": "text/plain" }),
    body: html,
  });
};
const resJPG = async (req, bin) => {
  await req.respond({
    status: 200,
    headers: new Headers({ "Content-Type": "image/jpeg" }),
    body: bin,
  });
};
const handleJSON = async (req, api) => { // async api(path, json)
  if (req.method === "OPTIONS") {
    await resJSON(req, "ok");
    return;
  }
  try {
    const json = await (async () => {
      if (req.method === "POST") {
        return await req.json();
      } else if (req.method === "GET") {
        const n = req.url.indexOf("?");
        if (n >= 0) {
          const sjson = decodeURIComponent(req.url.substring(n + 1));
          try {
            return JSON.parse(sjson);
          } catch (e) {
            return sjson;
          }
        }
      }
      return null;
    })();
    console.log("[req api]", json);
    const res = await api(req.path, json);
    console.log("[res api]", res);
    await resJSON(req, res);
  } catch (e) {
    console.log("err", e.stack);
  }
};
const resTempRedirect = async (req, url) => {
  await req.respond({
    status: 307, // Temporary Redirect
    headers: new Headers({
      "Location": url,
    }),
  });
};

const readJSON = async (fn, defaultdata) => {
  try {
    return JSON.parse(await Deno.readTextFile(fn));
  } catch (e) {
    return defaultdata;
  }
};
const writeJSON = async (fn, data) => {
  await Deno.writeTextFile(fn, JSON.stringify(data));
};

// main

const app = createApp();

const data = await readJSON("data.json", []);

app.handle(/\/*/, async (req) => {
  const id = req.path.substring(1);
  if (id.length == 0) {
    resHTML(req, await Deno.readTextFile("static/index.html"));
    return;
  }
  if (id < 0 || id >= data.length) {
    resTempRedirect(req, "https://fukuno.jig.jp/");
    return;
  }
  const { title, img, url } = data[id];
  //const { title, img, url } = JSON.parse(await Deno.readTextFile("data/1.json"));
  await resHTML(req, `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${title}</title>
<meta property="og:title" content="${title}">
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="${img}">
<meta property="og:image"  content="${img}">
</head>
<body>
<script type=module>
document.location.href = "${url}";
</script>
</body>
</html>`);
});

app.handle("/add", async (req) => {
  await handleJSON(req, async (path, json) => {
    if (json == null) {
      return null;
    }
    console.log("json", json);
    let id = data.findIndex(d => d.url == json.url);
    console.log(id, json.url);
    if (id >= 0) {
      data[id] = json;
    } else {
      id = data.length;
      data.push(json);
    }
    await writeJSON("data.json", data);
    return id;
  });
});
app.handle("/robots.txt", async (req) => {
  await resText(req, "");
});
app.handle("/ogpmaker.jpg", async (req) => {
  await resJPG(req, await Deno.readFile("static/ogpmaker.jpg"));
});

app.listen({ port: 8005, hostname: "::" });
