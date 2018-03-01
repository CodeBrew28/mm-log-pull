const { promisify } = require('util')

const mongoose = require('mongoose')
const AWS = require('aws-sdk')
const uuid = require('node-uuid')
const authenticate = require('mm-authenticate')(mongoose)
const { Team, Script, Log } = require('mm-schemas')(mongoose)
const { send, buffer } = require('micro')

mongoose.connect(process.env.MONGO_URL)
mongoose.Promise = global.Promise

const s3 = new AWS.S3({
  params: { Bucket: 'mechmania' }
})

const getObject = promisify(s3.getObject.bind(s3))

module.exports = authenticate(async (req, res) => {
  const urlParams = req.url.split('/')
  if(urlParams.length !== 3) {
    return send(res, 400, 'Malformed URL')
  }
  const [_, ...teamNames] = urlParams

  // Get latest logfile
  const index = teamNames.sort().join('-')
  const logFile = await Log.findOne({index}).sort({createdAt: -1}).exec()

  if (!logFile) {
    return send(res, 404, `Teams ${teamNames.join(' and ')} don't have a log file`)
  }
  if(!logFile.canBeAccessedBy(req.user)){
    return send(res, 401, 'Unauthorized')
  }

  const data = await getObject({
    Bucket: 'mechmania',
    Key: logFile.key
  })

  send(res, 200, data.Body)
})