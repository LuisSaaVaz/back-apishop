'use strict'



const {
    getConnection
} = require('../../../db/db')
const Joi = require('joi')
// const { getToken, getTokenData } = require('../../../../helpers')
const bcrypt = require('bcrypt')
const { getToken } = require('../../../../helpers')


async function validate(payload) {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().alphanum().min(3).max(30).required()
    })

    Joi.assert(payload, schema)
}


async function login(req, res) {

    // validar los datos que nos llegan desde la req.body(Email,password) 👌

    // Buscar en la base de datos el usuario y verificar que tenga la cuenta activada para logearse 👌

    //validar la contraseña con el bcrypt👌

    // Enviar respuesta al usurio del token que le permita estar logeado

    const accountData = {
        ...req.body
    }

    try {
        await validate(accountData)
    } catch (e) {
        return res.status(400).send({
            status: 'Bad request',
            message: 'Los datos introducidos no son correctos o faltan campos por rellenar'
        })

    }

    const query = `SELECT id, email, password, status, avatar 
    FROM users WHERE email = ? `

    let connection = null

    console.log(accountData.email)

    try {
        connection = await getConnection()

        const [rows] = await connection.execute(query, [accountData.email])
        connection.release()

        const user = rows[0]

        // comprobamos que exita el usuario
        if (rows.length !== 1) {
            res.status(401).send({
                status: "Unauthorized",
                message: "Esa cuenta no esta registrada o los datos no son correctos"
            })
        }

        // comprobamos que la contraseña es correcta
        const isPasswordOk = await bcrypt.compare(accountData.password, user.password)
        if (!isPasswordOk) {
            res.status(401).send({
                status: 'Unauthorized',
                message: 'Esa cuenta no esta registrada o la contraseña no es correcta',
            })
        }

        // comprobamos que la cuenta esta activada
        //comprobar que el status es null	


        if (user.status === null) {
            res.status(401).send({
                status: 'Unauthorized',
                message: 'Debe activar la cuenta para logearse revise su correo y compruebe la carpeta de SPAM'
            })
        }

        // generamos el token para reconocer al usuario cuando este navegando por los diferentes endpoints.

        const payloadJwt = {
            userId: user.id,
            email: user.email,
            status: user.status
        }

        const token = getToken(payloadJwt)

        // enviamos a front los siguientes datos

        const userSession = {
            accessToken: token,
            status: user.status,
            avatar: `${process.env.HTTP_SERVER_DOMAIN}/uploads/users/${user.id}/${user.avatar}`,
            expiresIn:3600,
        }

        res.status(200).send({
            status: 'ok',
            data: userSession
        })



    } catch (e) {
        if (connection !== null) {
            connection.release()
        }
    }


}

module.exports = login