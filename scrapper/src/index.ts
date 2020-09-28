import AWS from 'aws-sdk'
import cheerio from 'cheerio'
import chromium from 'chrome-aws-lambda'

const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10'})
const TABLE_NAME = 'goodoc-scrapper-scrapper'

type Scrapper = {
  scrapperId: string
  url: string
  schedules: string[]
  attrs: any
  scrapped: any[]
}


const updateScrapped = (scrapperId: string, scrapped: any) => {
  return new Promise((resolve, reject) => {
    docClient.update({
      TableName: TABLE_NAME,
      Key: {
        scrapperId: scrapperId
      },
      UpdateExpression: 'set scrapped = :sc',
      ExpressionAttributeValues: {
        ':sc': scrapped,
      },
      ReturnValues:"UPDATED_NEW"
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
      const { scrapperId, url, attrs } = <Scrapper>JSON.parse(event.Records[0].body)
      
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

      await updateScrapped(scrapperId, scrapped)
      
      return {
        statusCode: 200,
        body: 'Scrapping complete!'
      }
    }
   
  } catch (err) {
    callback(err)
  }
}