import AWS from 'aws-sdk'

const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10'})
const TABLE_NAME = 'goodoc-scrapper-scrapper'

const findByScrapperId = (scrapperId: string) => {
  return new Promise((resolve, reject) => {
    docClient.get({
      TableName: TABLE_NAME,
      Key: {
        scrapperId: scrapperId,
      }
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        if (data && data.Item) {
          resolve(data.Item)
        } else {
          resolve(null)
        }
      }
    })
  })
}

export const scrapped = async (event: any) => {
  const { pathParameters } = event
  let response = {}
  if (pathParameters && pathParameters.scrapperId) {
    const data = await findByScrapperId(pathParameters.scrapperId)
    if (data) {
      response = JSON.stringify(data)
    }
  }
  return {
    statusCode: 200,
    body: response
  };
}