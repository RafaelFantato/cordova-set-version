const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const semver = require("semver");

const builder = new xml2js.Builder({
    xmldec: {
        version: "1.0",
        encoding: "UTF-8"
    }
});

async function getNewVersionFromConfig(configXmlPath) {
    try {
        const xmlContent = fs.readFileSync(configXmlPath, "utf-8");
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlContent);
        
        if (result.widget.preference) {
            const preference = result.widget.preference.find(p => p.$.name === "NEW_VERSION");
            return preference ? preference.$.value : "";
        }
        return "";
    } catch (err) {
        console.error("[New Version] Erro ao ler NEW_VERSION do config.xml:", err);
        return "";
    }
}

async function replaceIcons(context) {
    const projectRoot = context.opts.projectRoot;

    const usesNewStructure = fs.existsSync(path.join(projectRoot, "platforms", "android", "app"));
    const basePath = usesNewStructure
        ? path.join(projectRoot, "platforms", "android", "app", "src", "main")
        : path.join(projectRoot, "platforms", "android");

    const configXmlPath = path.join(projectRoot, "config.xml");

    console.log(`[New Version] projectRoot: ${projectRoot}`);

    if (!fs.existsSync(configXmlPath)) {
        console.error(`[New Version] Arquivo config.xml não encontrado em: ${configXmlPath}`);
        return;
    }

    const newVersion = await getNewVersionFromConfig(configXmlPath);

    if (!newVersion) {
        console.log("[New Version] Variável NEW_VERSION não definida ou inválida. Nenhuma ação será realizada.");
        return;
    }

    try {
        const xmlContent = fs.readFileSync(configXmlPath, "utf-8");
        const parser = new xml2js.Parser();

        const result = await parser.parseStringPromise(xmlContent);

        if (result.widget.preference) {
            const indexNEW_VERSION = result.widget.preference.findIndex(p => p.$.name === "NEW_VERSION");
            if (indexNEW_VERSION !== -1) {
                result.widget.preference.splice(indexNEW_VERSION, 1);
                console.log('[New Version] Preferência "NEW_VERSION" removida com sucesso.');
            } else {
                console.log('[New Version] Preferência "NEW_VERSION" não encontrada.');
            }
        }

        result.widget.$.version = newVersion;

        if (result.widget.$["android-versionCode"]) {
            const newVersionCode = parseInt(result.widget.$["android-versionCode"]) + 1;
            result.widget.$["android-versionCode"] = newVersionCode.toString();
            console.log(`[New Version] android-versionCode atualizado para ${newVersionCode}`);
        }

        const newXmlContent = builder.buildObject(result);
        fs.writeFileSync(configXmlPath, newXmlContent, "utf-8");

        console.log("[New Version] Arquivo config.xml modificado com sucesso!");
    } catch (err) {
        console.error("[New Version] Erro ao modificar o config.xml:", err);
    }
}

module.exports = replaceIcons;
