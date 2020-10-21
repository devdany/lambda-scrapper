import AWS from 'aws-sdk'

const sqs = new AWS.SQS({ apiVersion: '2012-11-05' })
const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10'})

const TABLE_NAME = 'goodoc-scrapper-scrapper'
const SQS_URL = 'https://sqs.ap-northeast-2.amazonaws.com/088944302557/selector-queue.fifo'
const GROUP_ID = 'selectorqueue'
type Scrapper = {
  scrapperId: string
  url: string
  schedules: string[]
  attrs: any
  scrapped: any[]
}

// 매분, 매 시간, 하루 한번



const findAllScrapper = (): Promise<Scrapper[]> => {
  return new Promise((resolve, reject) => {
    docClient.scan({
      TableName: TABLE_NAME
    }, (err, result) => {
      if (err) {
        reject(err)
      } else {
        if (!result) {
          resolve([])
        } else {
          resolve(<Scrapper[]>result.Items)
        }
      }
    })
  })
}

const scheduleChecker = (schedules: string[]) => {
  const date = new Date()
  const hours = date.getHours()
  const minutes = date.getMinutes()

  let isPass = false
  for (const schedule of schedules) {
    if (schedule === 'em') {
      // 스케줄러가 1분에 한번 돌거기 때문에 매번 enqueue 해주면 됨
      isPass = true
    } else if (schedule === 'eh') {
      isPass = minutes === 0
    } else if (schedule.endsWith('h') && minutes === 0) {
      // 하루 한번, 매 시마다
      const scheduleHour = schedule.slice(0, -1)
      isPass = Number(scheduleHour) === hours
    } else if (schedule.endsWith('m')) {
      // 한 시간에 한번, 매 시마다
      const scheduleMin = schedule.slice(0, -1)
      isPass = Number(scheduleMin) === minutes
    }

    if (isPass) {
      break
    }
  }

  return isPass
}

const pushToSQS = (scrapper: Scrapper) => {
  return new Promise((resolve, reject) => {
    const params = {
      QueueUrl: SQS_URL,
      MessageDeduplicationId: scrapper.scrapperId,
      MessageBody: JSON.stringify(scrapper),
      DelaySeconds: 0,
      MessageGroupId: GROUP_ID,
    }
    sqs.sendMessage(params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
 
}

export const listener = async () => {
  const scrappers = await findAllScrapper()
  for (const scrapper of scrappers) {
    if (!scheduleChecker(scrapper.schedules)) {
      continue
    }
    // enqueue
    await pushToSQS(scrapper)
  }
  return {
    statusCode: 200,
    body: 'Enqueue complete!'
  };
}