'use strict'

const mailgun = require('mailgun-js')
const { getConnection } = require('../../../db/db')
const Joi = require('joi')
const { getToken } = require('../../../../helpers')

async function validateProduct(product) {
    const schema = Joi.object({
        id: Joi.number().required(),
    })

    Joi.assert(product, schema)
}

async function sendEmail({ emailFrom, emailTo, product, idProduct, token }) {
    const mg = mailgun({
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
    })

    const data = {
        from: emailFrom,
        to: emailTo,
        subject: 'Solicitud de compra',
        html: `<h2>El usuario solicita la compra del siguiente producto.</h2>
                <p> ${JSON.stringify(product)} </p>
                <h3>Acceda al siguiente enlace para indicar lugar y hora de entrega en caso de acceptar la solicitud de compra.</h3>
                <a href=" http://localhost:3000/products/${idProduct}/confirm?email=${token}">---> Click aquí para aceptar la compra <---</a>`,
    }
    mg.messages().send(data, (error, body) => {
        if (error) {
            console.error('error', error)
        }
        return body
    })
}

async function buyProduct(req, res) {
    /*
     * 1 . Validar datos que nos llegan por los params, en concreto el (id)👌
     * 2 . Comprobar que el producto se encuentra en la DDBB y que el status no sea "bought"👌
     * 3. Enviar un correo con los datos necesarios del comprador y del producto👌
     */
    const data = {
        id: req.params.id,
    }

    const emailFrom = req.claims.email

    const payload = {
        email: emailFrom,
        idProduct: data.id,
    }

    try {
        await validateProduct(data)
    } catch (e) {
        return res.status(400).send({
            status: 'Bad request',
            message: 'Los datos introducidos no son correctos',
        })
    }

    let connection = null
    try {
        // conectarnos a la base de datos y hacer la query para obtener el producto
        connection = await getConnection()
        let token = await getToken(payload)
        const [rows] =
            await connection.query(`SELECT u.email , p.id AS productId, p.name AS productName , p.status AS productStatus
        FROM users u JOIN products p ON u.id = p.user_id
        WHERE p.id = ${data.id} `)
        connection.release()
        console.log(rows[0])

        // comprobamos que exista el producto
        if (rows[0] === undefined) {
            return res.status(400).send({
                sucess: 'bad request',
                message: 'el producto no existe',
            })
        }
        const userProduct = rows[0]

        //comprobamos que el producto no este comprado

        if (userProduct.productStatus !== null) {
            return res.status(403).send({
                status: 'Denied',
                message: 'Ese producto ya ha sido vendido',
            })
        }

        // comprobamos que los correos no sean iguales
        if (userProduct.email === emailFrom) {
            return res.status(403).send({
                status: 'Denied',
                message: 'No puedes comprar un producto que es tuyo',
            })
        }

        // creamos el objeto para enviar el correo
        const response = {
            emailFrom: emailFrom,
            emailTo: userProduct.email,
            product: {
                id: userProduct.productId,
                name: userProduct.productName,
                status: userProduct.productStatus,
            },
            idProduct: userProduct.productId,
            token: token,
        }
        console.log(response)
        sendEmail(response)

        res.status(200).send({
            status: 'success',
            message: `La solicitud de compra ha sido enviada correctamente `,
        })
    } catch (e) {
         connection.release()
        res.status(500).send({
            status: 'error',
            message: 'Error en el servidor',
        })
        
    } finally {
        if (connection !== null) connection.release()
    }
}

module.exports = buyProduct
