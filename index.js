'use strict'

require('dotenv').config()

// this file is the entry point of the application
// gonna connect to the database and start the server

const { connect } = require('./app/db/db')
const { listen } = require('./app/webserver/index')

const port = process.env.PORT

if (!port) {
    console.error('PORT must be defined as environment variable')
    process.exit(1)
}

process.on('unhandledRejection', (err) => {
    console.error(err)
})

async function initApp() {
    try {
        await connect()
        await listen(port)
        console.log(`webserver listening at port ${port}`)
    } catch (e) {
        console.error(e)
        process.exit(1)
    }
}

initApp()
