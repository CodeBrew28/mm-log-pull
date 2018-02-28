const { promisify } = require('util')

const mongoose = require('mongoose')
const AWS = require('aws-sdk')
const uuid = require('node-uuid')
const { Team, Script, Log } = require('mm-schemas')(mongoose)
const { send, buffer } = require('micro')

mongoose.connect(process.env.MONGO_URL)
mongoose.Promise = global.Promise

const s3 = new AWS.S3({
  params: { Bucket: 'mechmania' }
})

const getObject = promisify(s3.getObject.bind(s3))

module.exports = async (req, res) => {
  const urlParams = req.url.split('/')
  if(urlParams.length !== 3) {
    send(res, 400, 'Malformed URL')
    return
  }
  const [_, ...teamNames] = urlParams
  const logFile = await Log.findOne({index: teamNames.sort().join('-')}).exec()

  if (!logFile) {
    send(res, 404, `Teams ${teamNames.join(' and ')} don't have a log file`)
    return;
  }

  const data = await getObject({
    Bucket: 'mechmania',
    Key: logFile.key
  })

  send(res, 200, data.Body)
}