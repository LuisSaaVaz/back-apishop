'use strict'

const express = require('express')
const cors = require('cors')
const accountRouter = require('./routes/account-router')
const authRouter = require('./routes/auth-router')
const productsRouter = require('./routes/products-router')
const usersRuoter = require('./routes/users-router')
const likesRouter = require('./routes/likes-router')
const path = require('path')

const app = express()

//CORS para permitir peticiones desde el front
app.use(cors())

app.use(express.static(path.join(process.cwd(), 'public'))) // para que se pueda acceder a los archivos estaticos de la carpeta public

app.use(express.json()) // middleware para leer los datos en formato json de la req.body

// RUTAS DE LA APP

app.use('/api', accountRouter)
app.use('/api', authRouter)
app.use('/api', productsRouter)
app.use('/api', usersRuoter)
app.use('/api', likesRouter)

app.use((req, res) => {
    res.status(404).send({
        status: 404,
        message: 'Not found',
    })
})

// middlewer de error 404

app.use((error, req, res, next) => {
    console.error(error)
    res.status(error.httpStatus || 500).send({
        status: 'error',
        message: error.message,
    })
})

// funcion listener de la app que inicia el servidor
async function listen(port) {
    const server = await app.listen(port)

    return server
}

module.exports = {
    listen,
}
