/*
 * Copyright 2025 Sayak Mukhopadhyay
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import express from 'express'
import compression from 'compression'
import { createServer } from 'http'
import cors from 'cors'

import config from './config.js'
import redisStore from './redis.js'

import configRoutes from './routes/config.js'
import githubRoutes from './routes/github.js'
import session from 'express-session'

let app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(compression())
app.use(
  session({
    store: redisStore,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
)

if (app.get('env') === 'development') {
  app.use(
    cors({
      origin: /^http:\/\/localhost.*/,
      credentials: true,
    }),
  )
}

app.use('/api/config', configRoutes)
app.use('/api/github', githubRoutes)

let port = validatePort(config.port)
app.set('port', port)

let server = createServer(app)
server.listen(port)

server.on('error', onError)
server.on('listening', onListening)

function validatePort(port) {
  if (port < 0) {
    throw new Error('Port must be a whole number')
  }
  return port
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error
  }

  let bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`)
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`)
      process.exit(1)
      break
    default:
      throw error
  }
}

function onListening() {
  let addr = server.address()
  let bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`
  console.debug(`Listening on ${bind}`)
}
