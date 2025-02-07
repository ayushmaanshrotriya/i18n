/* eslint-disable no-sync */

// Import Node.js Dependencies
import fs from "node:fs";
import path from "node:path";

// Import Third-party Depedencies
import cacache from "cacache";
import lodashGet from "lodash.get";

// Import Internals
import { CACHE_PATH, CURRENT_LANG } from "./src/constants.js";
import { languages } from "./languages/index.js";

import { taggedString } from "./src/utils.js";
export { taggedString };

export const CONSTANTS = Object.seal({
  CACHE_PATH, CURRENT_LANG, LANG_UPDATED: true
});

export async function getLocalLang() {
  if (CONSTANTS.LANG_UPDATED) {
    try {
      const { data } = await cacache.get(CACHE_PATH, "cli-lang");
      CONSTANTS.CURRENT_LANG = data.toString();
    }
    catch (error) {
      await cacache.put(CACHE_PATH, "cli-lang", CURRENT_LANG);
      CONSTANTS.CURRENT_LANG = CURRENT_LANG;
    }
    CONSTANTS.LANG_UPDATED = false;
  }

  return CONSTANTS.CURRENT_LANG;
}

export async function setLocalLang(selectedLang) {
  await cacache.put(CACHE_PATH, "cli-lang", selectedLang);
  CONSTANTS.LANG_UPDATED = true;
}

export async function getLanguages() {
  const currentLang = await getLocalLang();

  const langs = Object.keys(languages);
  langs.splice(langs.indexOf(currentLang), 1);
  langs.unshift(currentLang);

  return langs;
}

export async function getToken(token, ...params) {
  if (typeof token !== "string") {
    throw new TypeError("token must be a string");
  }

  const lang = await getLocalLang();
  if (!Reflect.has(languages, lang)) {
    throw new Error(`Invalid i18n lang -> ${lang}`);
  }

  const langToken = lodashGet(languages[lang], token);
  if (typeof langToken === "undefined" || langToken === null) {
    throw new Error(`Invalid i18n token -> ${token} for lang -> ${lang}`);
  }

  return params.length === 0 ? langToken : langToken(...params);
}

export function extend(extendLanguage, opts = {}) {
  if (extendLanguage in languages) {
    Object.assign(languages[extendLanguage], opts);
  }
  else {
    languages[extendLanguage] = opts;
  }
}

export function extendFromSystemPath(languagesDirPath) {
  if (!fs.existsSync(languagesDirPath)) {
    throw new Error(`The ${languagesDirPath} directory does not exist on this project.`);
  }
  const files = (fs.readdirSync(languagesDirPath, { withFileTypes: true }))
    .filter((dirent) => dirent.isFile() && path.extname(dirent.name) === ".js");

  for (const file of files) {
    const langName = path.basename(file.name, ".js");
    const data = fs.readFileSync(path.join(languagesDirPath, file.name), "utf-8");
    extend(langName, JSON.parse(data));
  }
}
