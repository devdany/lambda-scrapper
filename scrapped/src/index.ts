import AWS from 'aws-sdk'

const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10'})
const TABLE_NAME = 'goodoc-untact-scrapper-scrapped'

const findBySelectorId = (selectorId: string) => {
  return new Promise((resolve, reject) => {
    docClient.scan({
      TableName: TABLE_NAME,
      FilterExpression: 'selector_id = :sid',
      ExpressionAttributeValues: {
        ':sid': selectorId
      },
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

export const scrapped = async (event: any) => {
  const { pathParameters } = event
  let response = 'no-data'
  if (pathParameters && pathParameters.selectorId) {
    const data = await findBySelectorId(pathParameters.selectorId)
    response = JSON.stringify(data)
  }
  return {
    statusCode: 200,
    body: response
  };
}