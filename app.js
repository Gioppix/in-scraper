import puppeteer from "puppeteer";

import fs from "fs";
import csv from "csv-parser";

// Define the module function

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

for (let link of links) {
}

async function readJsonFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, "utf-8");
    const json = JSON.parse(data);
    return json;
  } catch (error) {
    console.error(`Error reading file from disk: ${error}`);
  }
}

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();

// Set the cookie

await page.setCookie(...(await readJsonFile("www.linkedin.com.cookies.json")));
console.log();
for (let link of links) {
  try {
    // Go to the link and wait for networkidle0, which waits until there are no network connections for at least 500 ms
    await page.goto(link, { waitUntil: "networkidle0", timeout: 60000 });
    const title = await page.$eval("title", (element) => element.textContent);
    console.log(`Title: ${title}`);
  } catch (error) {
    console.error(`Failed to fetch page ${link}: ${error}`);
  }
}
await browser.close();
