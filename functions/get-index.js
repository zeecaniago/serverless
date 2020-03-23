const fs = require("fs")
const Mustache = require('mustache')
const http = require('superagent-promise')(require('superagent'), Promise)
const aws4 = require('aws4')
const URL = require('url')

const restaurantsApiRoot = process.env.restaurants_api
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const awsRegion = process.env.AWS_REGION
const cognitoUserPoolId = process.env.cognito_user_pool_id
const cognitoClientId = process.env.cognito_client_id

let html

const getRestaurants = async () => {
  const url = URL.parse(restaurantsApiRoot)

  const opts = {
    host: url.hostname,
    path: url.pathname
  }

  aws4.sign(opts)

  return (await http
    .get(restaurantsApiRoot)
    .set('Host', opts.headers['Host'])
    .set('X-Amz-Date', opts.headers['X-Amz-Date'])
    .set('Authorization', opts.headers['Authorization'])
    .set('X-Amz-Security-Token', opts.headers['X-Amz-Security-Token']) 
  ).body
}

function loadHtml () {
  if (!html) {
    console.log('loading index.html...')
    html = fs.readFileSync('static/index.html', 'utf-8')
    console.log('loaded')
  }
  
  return html
}

module.exports.handler = async (event, context) => {
  const template = loadHtml()
  const restaurants = await getRestaurants()
  const dayOfWeek = days[new Date().getDay()]
  const view = {
    awsRegion,
    cognitoUserPoolId,
    cognitoClientId,
    dayOfWeek,
    restaurants,
    searchUrl: `${restaurantsApiRoot}/search`
  }
  const html = Mustache.render(template, view)
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8'
    },
    body: html
  }

  return response
}
