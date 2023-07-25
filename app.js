import puppeteer from "puppeteer";
import fs from "fs";
import csv from "csv-parser";
import { Configuration, OpenAIApi } from "openai";
import pLimit from "p-limit";

const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

let links = await new Promise((resolve, reject) => {
  const results = [];
  fs.createReadStream("./listkit_people_report.csv")
    .pipe(csv())
    .on("data", (data) => results.push(data["Linkedin"]))
    .on("end", () => {
      resolve(results);
    })
    .on("error", (error) => {
      reject(error);
    });
});

links = links.map((l) => "https://" + l);
console.log(links);

async function readJsonFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, "utf-8");
    const json = JSON.parse(data);
    return json;
  } catch (error) {
    console.error(`Error reading file from disk: ${error}`);
  }
}

const browser = await puppeteer.connect({
  browserWSEndpoint:
    "ws://127.0.0.1:9222/devtools/browser/8188abdd-531a-4bd2-8f6b-1c74c2f9209f",
});

const finalmente = new Map();
const limit = pLimit(5); // This line is new
const promises = [];

for (let link of links) {
  promises.push(
    limit(() =>
      (async () => {
        try {
          // This line is changed
          const newLink = link;
          const page = await browser.newPage();
          await page.goto(newLink, {});

          const data = await Promise.all([
            page
              .waitForSelector(".text-body-medium.break-words")
              .then(() =>
                page.$eval(
                  ".text-body-medium.break-words",
                  (e) => e.textContent
                )
              ),

            page
              .waitForSelector(
                "* > div.display-flex.ph5.pv3 > div > div > div > span:nth-child(1)"
              )
              .then(() =>
                page.$eval(
                  "* > div.display-flex.ph5.pv3 > div > div > div > span:nth-child(1)",
                  (e) => e.textContent
                )
              ),
          ]);

          await page.close();

          return openai
            .createChatCompletion({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "user",
                  content:
                    "I want to connect to this person. Make a quick message (max one sentence) given the following linkedin data. Do not greet as i will be doing it. Data: " +
                    data.toString(),
                },
              ],
            })
            .then((chat_completion) => {
              finalmente.set(
                newLink,
                chat_completion.data.choices[0].message.content
              );
              console.log("ciao");
            });
        } catch (e) {
          console.log(e);
        }
      })()
    )
  );
}

await Promise.all(promises);
console.log(finalmente);

process.exit();
