const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

function unpack(htmlPath, outDir) {
  const content = fs.readFileSync(htmlPath, "utf8");
  const manifestMatch = content.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
  const templateMatch = content.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
  const pageOrderMatch = content.match(/<script type="__bundler\/page_order">([\s\S]*?)<\/script>/);
  
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  let templateStr = "";
  if (templateMatch) {
    try {
      templateStr = JSON.parse(templateMatch[1]);
      fs.writeFileSync(path.join(outDir, "template_raw.html"), templateStr);
    } catch(e) {
      fs.writeFileSync(path.join(outDir, "template_raw.txt"), templateMatch[1]);
    }
  }

  if (pageOrderMatch) {
    fs.writeFileSync(path.join(outDir, "page_order.json"), pageOrderMatch[1]);
  }
  
  if (manifestMatch) {
    const manifest = JSON.parse(manifestMatch[1]);
    console.log("Unpacking", htmlPath, "entries:", Object.keys(manifest).length);
    let resolvedHtml = templateStr;

    for (const [key, item] of Object.entries(manifest)) {
      let buf = Buffer.from(item.data, "base64");
      if (item.compressed) {
        buf = zlib.gunzipSync(buf);
      }
      let ext = ".txt";
      if (item.mime.includes("javascript")) ext = ".js";
      else if (item.mime.includes("css")) ext = ".css";
      else if (item.mime.includes("html")) ext = ".html";
      
      const filePath = path.join(outDir, `${key}${ext}`);
      fs.writeFileSync(filePath, buf);
      console.log(` - ${key} (${item.mime}): ${buf.length} bytes`);

      // If template contains this key as a blob / script src / style src, replace or inline
      if (resolvedHtml && typeof resolvedHtml === 'string') {
        const textContent = buf.toString("utf8");
        if (item.mime.includes("javascript")) {
          resolvedHtml = resolvedHtml.replace(new RegExp(`src="[^"]*${key}[^"]*"`, 'g'), `data-inlined="${key}"`);
          // or replace placeholder
        }
      }
    }

    // Also write unpacked bundle full HTML if possible
    fs.writeFileSync(path.join(outDir, "index_standalone.html"), resolvedHtml);
  }
}

try {
  unpack("C:/Users/venki/.gemini/antigravity-ide/brain/c7a95ccb-0400-47fc-946b-f531f3c97591/.user_uploaded/media_1788458102635.html", "d:/Somaalammatalli-Temple-Project/unpacked_bundle_1");
  unpack("C:/Users/venki/.gemini/antigravity-ide/brain/c7a95ccb-0400-47fc-946b-f531f3c97591/.user_uploaded/media_1788458102672.html", "d:/Somaalammatalli-Temple-Project/unpacked_bundle_2");
  console.log("SUCCESS");
} catch(err) {
  console.error("ERROR:", err);
}
