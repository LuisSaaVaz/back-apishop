'use strict'

//Necesitamos conectar con la DDBB
const { getConnection } = require('../../../db/db.js')

//Importar del archivo de la ruta ../helpers.js la Variable que uso para la Gestion de Errores
const { generateError, validateLikes } = require('../../../../helpers.js')

/***************************************************************
 ***************************BY ID*******************************
 **************************************************************/

const deleteLikeById = async (req, res, next) => {
    const id = req.params.id
    console.log(id)
    const logUser_id = req.claims.userId
    console.log(logUser_id)
    try {
        await validateLikes({ id })
    } catch (error) {
        return res.status(400).send({
            status: 'Bad Request',
            message: error.details[0].message,
        })
    }
    let connection = null
    try {
        connection = await getConnection()
        //Comprobar si existe el like
        const [like] = await connection.query(
            `SELECT product_id FROM likes WHERE id = ${id}`
        )
        //Comprobar si existe el producto
        const [product] = await connection.query(
            `SELECT user_id FROM products WHERE status IS NULL AND id = ${like[0].product_id}`
        )
        //Comprobar si el like lo ha dado el lover que esta logeado
        const [lover] = await connection.query(
            `SELECT id FROM likes WHERE id = ${id} AND lover_id = ${logUser_id}`
        )

        if (product.length === 0) {
            throw generateError(
                'Not found. No existe, se compró o se borró el producto',
                404
            )
        } else if (like.length === 0) {
            throw generateError('Not found. No existe el like', 404)
        } else if (lover.length === 0) {
            throw generateError(
                'Forbidden. No tienes permiso para borrar un like que no te pertenece',
                403
            )
        } else {
            //Borrar el like
            await connection.query(`DELETE FROM likes WHERE id = ${id}`)
            //Calcular el nuevo numero de likes del producto
            const [totalLikes] = await connection.query(
                `Select COUNT(*) as likes FROM likes WHERE product_id = ${like[0].product_id}`
            )
            //Calcular el nuevo numero de likes que tiene el lover
            const [totalLoves] = await connection.query(
                `Select COUNT(*) as loves FROM likes WHERE lover_id = ${logUser_id}`
            )
            //Calcular el nuevo numero de likes que tiene el usuario dueño del producto
            const [totalUserLikes] = await connection.query(
                `Select COUNT(*) as userLikes FROM likes WHERE user_id = ${product[0].user_id}`
            )

            //Actualizar los likes del producto
            await connection.query(
                `UPDATE products SET likes = ${totalLikes[0].likes} WHERE id = ${like[0].product_id}`
            )
            //Actualizar los likes del lover
            await connection.query(
                `UPDATE users SET loves = ${totalLoves[0].loves} WHERE id = ${logUser_id}`
            )
            //Actualizar los likes del usuario dueño del producto
            await connection.query(
                `UPDATE users SET likes = ${totalUserLikes[0].userLikes} WHERE id = ${product[0].user_id}`
            )
        }

        //Si todo va bien
        res.status(200).send({
            status: 'Deleted',
            message: `Like borrado y restado`,
        })
    } catch (error) {
        next(error)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

/***************************************************************
 ***********************BY PRODUCT ID***************************
 **************************************************************/

const deleteLikeByProductId = async (req, res, next) => {
    const product_id = req.params.product_id
    console.log(product_id)
    const lover_id = req.claims.userId
    console.log(lover_id)

    let connection = null
    try {
        await validateLikes({ product_id: product_id })
    } catch (error) {
        return res.status(400).send({
            status: 'Bad Request',
            message: error.details[0].message,
        })
    }
    try {
        connection = await getConnection()
        //Comprobar si existe el producto y obtener el user_id del dueño del producto
        const [product] = await connection.query(
            `SELECT user_id FROM products WHERE status IS NULL AND id = ${product_id}`
        )
        //Comprobar si existe el producto en likes
        const [like] = await connection.query(
            `SELECT id FROM likes WHERE product_id = ${product_id}`
        )
        //Comprobar si el like lo ha dado el lover que esta logeado
        const [lover] = await connection.query(
            `SELECT id FROM likes WHERE product_id = ${product_id} AND lover_id = ${lover_id}`
        )

        if (product.length === 0) {
            throw generateError(
                'Not found. No existe, se compró o se borró el producto',
                404
            )
        } else if (like.length === 0) {
            throw generateError('Not found. No existe el like', 404)
        } else if (lover.length === 0) {
            throw generateError(
                'Forbidden. No tienes permiso para borrar un like que no te pertenece',
                403
            )
        } else {
            //Borrar el like
            await connection.query(`
                DELETE FROM likes WHERE product_id = ${product_id} AND lover_id = ${lover_id}`)
            //Calcular el nuevo numero de likes del producto
            const [totalLikes] = await connection.query(
                `Select COUNT(*) as likes FROM likes WHERE product_id = ${product_id}`
            )
            //Calcular el nuevo numero de likes que tiene el lover
            const [totalLoves] = await connection.query(
                `Select COUNT(*) as loves FROM likes WHERE lover_id = ${lover_id}`
            )
            //Calcular el nuevo numero de likes que tiene el usuario dueño del producto
            const [totalUserLikes] = await connection.query(
                `Select COUNT(*) as userLikes FROM likes WHERE user_id = ${product[0].user_id}`
            )

            //Actualizar los likes del producto
            await connection.query(
                `UPDATE products SET likes = ${totalLikes[0].likes} WHERE id = ${product_id}`
            )
            //Actualizar los likes del lover
            await connection.query(
                `UPDATE users SET loves = ${totalLoves[0].loves} WHERE id = ${lover_id}`
            )
            //Actualizar los likes del usuario dueño del producto
            await connection.query(
                `UPDATE users SET likes = ${totalUserLikes[0].userLikes} WHERE id = ${product[0].user_id}`
            )
        }
        //Si todo va bien
        res.status(200).send({
            status: 'Deleted',
            message: `Like borrado y restado`,
        })
    } catch (error) {
        next(error)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

module.exports = { deleteLikeById, deleteLikeByProductId }
