import AWS from 'aws-sdk'
import { v4 as generateId } from 'uuid'
import cheerio from 'cheerio'
import chromium from 'chrome-aws-lambda'

const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10'})
const TABLE_NAME = 'goodoc-untact-scrapper-scrapped'

type Selector = {
  id: string
  url: string
  schedules: string[]
  attrs: any
}

const insertDB = (selectorId: string, scrapped: any) => {
  return new Promise((resolve, reject) => {
    docClient.put({
      TableName: TABLE_NAME,
      Item: {
        id: generateId(),
        scrapped: scrapped,
        selector_id: selectorId
      }
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

// const testSelector: Selector = {
//   id: 'abcd-efgg',
//   url: "https://pf.kakao.com/_xcBxnxah",
//   attrs: {
//     name: ".desc_info>.tit_info",
//     friendCount: ".desc_info .txt_count>.num_count"
//   },
//   schedules: ["em", "10m"]
// }

export const scrapper = async(event: any, context: any, callback: any) => {
  try {
    if (event.Records && event.Records.length > 0 && event.Records[0].body) {
      const { id, url, attrs } = <Selector>JSON.parse(event.Records[0].body)
      
      const browser = await chromium.puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath,
        defaultViewport: chromium.defaultViewport,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      })

      const page = await browser.newPage()
      await page.goto(url)
      const content = await page.content()
      const $ = cheerio.load(content)

      const scrapped: any = {}
      for (const key in attrs) {
        const selector = attrs[key]
        $(selector).children().remove()
        scrapped[key] = $(selector).text()
      }

      await insertDB(id, scrapped)
      
      return {
        statusCode: 200,
        body: 'Scrapping complete!'
      }
    }
   
  } catch (err) {
    callback(err)
  }
}