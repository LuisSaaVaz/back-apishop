'use strict'

const { getConnection } = require('../../../db/db')
const Joi = require('joi')

async function validate(payload) {
    const schema = Joi.object({
        productId: Joi.number().integer().required(),
        vote: Joi.number().integer().min(1).max(5).required(),
    })

    Joi.assert(payload, schema)
}

async function putScoreUsers(req, res) {
    /*
     * 1 . Validar datos que nos llegan por los params, en concreto el (id) 👌
     * 2 . Comprobar que el producto ha sido comprado y que el status sea "bought" en la DDBB. 👌
     * 3.  Otras validaciones: que el usuario solo pueda valorar productos que no le pertenezcan y solo pueda valorar una vez por producto 👌
     * 4 . Comprobar que el producto ha sido entregado mirando la hora de entrega y la hora actual. 👌
     * 5 . Puntuar al usuario que ha vendido el producto.
     * 6 . Devolver la media de puntuaciones que tiene el usuario.
     */

    const data = {
        productId: req.params.id,
        vote: req.query.vote,
    }

    const userData = {
        id: req.claims.userId,
    }

    console.log(userData)
    try {
        await validate(data)
    } catch (e) {
        console.log(e)
        res.status(400).send({
            status: 'Bad Request',
            message:
                'Los datos introducidos no son correctos, recuerde que la puntuacion debe ser un numero entre 1 y 5',
        })
    }

    let connection = null

    try {
        connection = await getConnection()
        const [rows] = await connection.query(
            'SELECT status, user_id, valoration FROM products WHERE id = ?',
            [data.productId]
        )

        // comprobamos que exista el producto
        if (rows[0] === undefined) {
            res.status(400).send({
                status: 'Bad Request',
                message: 'El producto no existe',
            })
        }

        // comprobamos que el producto ha sido comprado y que el status sea "bought" en la DDBB.
        const product = rows[0]
        if (product.status !== 'bought') {
            return res.status(403).send({
                status: 'Forbidden',
                message:
                    'El producto no ha sido comprado, aun no puedes valorar al usuario',
            })
        }

        // comprobamos que el usuario solo pueda valorar productos que no le pertenezcan

        if (product.user_id === userData.id) {
            return res.status(403).send({
                status: 'Forbidden',
                message: 'No puedes puntuarte a ti mismo 😅',
            })
        }

        // comprobamos que el prodcuto haya sido valorado una vez por usuario
        if (product.valoration !== null) {
            return res.status(403).send({
                status: 'Forbidden',
                message: 'El produto ya ha sido valorado',
            })
        }
    } catch (e) {
        console.log(e)
        res.status(500).send({
            status: 'Internal Server Error',
        })
    } finally {
        if (connection) {
            connection.release()
        }
    }

    // comprobamos que el producto ha sido entregado mirando la hora de entrega y la hora actual.

    const now = new Date()
    try {
        connection = await getConnection()
        const [rows] = await connection.query(
            'SELECT * FROM bookings WHERE product_id = ? ',
            [data.productId]
        )

        const booking = rows[0]

        if (!booking) {
            return res.status(403).send({
                status: 'Forbidden',
                message:
                    'El producto no ha sido vendido, no puede puntuar al usuario',
            })
        }

        const date = new Date(booking.delivery_time)
        console.log(now)
        console.log(date)
        if (now.getTime() < date.getTime() ) {
            return res.status(403).send({
                status: 'forbidden',
                message:
                    'El producto no ha sido entregado, no puede puntuar al usuario',
            })
        }
    } catch (e) {
        console.log(e)
        res.status(500).send({
            status: 'Internal Server Error',
        })
    } finally {
        if (connection) {
            connection.release()
        }
    }

    // puntuar al usuario que ha vendido el producto.
    try {
        connection = await getConnection()
        await connection.query(
            'UPDATE products SET valoration = ? WHERE id = ?',
            [data.vote, data.productId]
        )
        // devolvemos la id del usuario para que se pueda recuperar su puntuacion
        const [product] = await connection.query(
            'SELECT user_id FROM products WHERE id = ?',
            [data.productId]
        )
        const userId = product[0].user_id

        //Recuperar el total de valoration que tienen los productos del usuario
        const [totalValoration] = await connection.query(
            `SELECT COUNT(valoration) AS total FROM products WHERE status='bought' AND user_id = ${userId}`
        )
        //Actualizar el total de votes que tiene el usuario
        await connection.query(
            `UPDATE users SET votes = ${totalValoration[0].total} WHERE id = ${userId}`
        )

        // devolvemos la media de puntuaciones que tiene el usuario
        const [rows] = await connection.query(
            `SELECT u.email, u.id AS UserId, AVG(p.valoration) AS MediaPuntuaciones
        FROM users u LEFT JOIN products p
        ON u.id = p.user_id
        WHERE p.user_id = ? AND p.valoration IS NOT NULL`,
            [userId]
        )

        if (rows[0] === undefined) {
            return res.status(404).send({
                status: 'Not Found',
                message: 'No hay puntuaciones para el usuario',
            })
        }

        const media = rows[0].MediaPuntuaciones
        console.log(rows[0].MediaPuntuaciones)

        await connection.query(`UPDATE users SET score = ? WHERE id = ?`, [
            media,
            userId,
        ])

        res.status(200).send({
            status: 'OK',
            message: 'Puntuacion realizada con exito',
            data: rows[0],
        })
    } catch (e) {
        console.log(e)
        res.status(500).send({
            status: 'Internal Server Error',
        })
    } finally {
        if (connection !== null) {
            connection.release()
        }
    }
}

module.exports = putScoreUsers
