import 'core-js/stable';
import 'regenerator-runtime/runtime';
import WordParser from './wordparser';
import DuolingoClient from './duolingoclient';
import * as GoogleTranslate from 'google-translate';
import * as fs from 'fs';


export default class TranslationDownloader {
    htmlPagePath: string;
    googleApiKey: string;
    skillTreePath: string
    constructor(skillTreePath: string, htmlPagePath: string, googleApiKey: string) {
        this.htmlPagePath = htmlPagePath;
        this.googleApiKey = googleApiKey;
        this.skillTreePath = skillTreePath;
    }

    downloadTranslation() {
        const fileBody = fs.readFileSync(this.htmlPagePath, {
            encoding: 'utf8'
        });
        const skillTree = JSON.parse(fs.readFileSync(this.skillTreePath, 'utf-8'))
        const parser = new WordParser(fileBody, skillTree);
        const client = new DuolingoClient();
        const parsedCourse = parser.parse();
        const translateClient = GoogleTranslate(this.googleApiKey);

        const translate = async () => {
            for (let partName in parsedCourse) {
                const part = parsedCourse[partName];
                for (let skillName in part) {
                    const skill = part[skillName];
                    for (let word in skill.words) {
                        const translation = await client.getDefinition('es', 'en', encodeURI(word))
                            .catch(err => {
                                console.error('could not translate word from duolingo. trying google translate', word);
                                const p = new Promise((resolve, reject) => {
                                    translateClient.translate(word, 'es', 'en', (err, result) => {
                                        if (err) {
                                            console.error(err);
                                            throw err;
                                        }

                                        let translations = [];
                                        translations.push(result.translatedText);
                                        resolve(translations);
                                    });
                                });

                                return p;
                            });
                        console.log(word, translation);
                        parsedCourse[partName][skillName].words[word].translations = translation;
                    }
                }
            }

            fs.writeFileSync(this.htmlPagePath.replace('.html', '.json'), JSON.stringify(parsedCourse));
        }

        translate();
    }
}

