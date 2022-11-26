'use strict'

//Necesitamos conectar con la DDBB
const { getConnection } = require('../../../db/db.js')

//Importar del archivo de la ruta ../helpers.js la Variable que uso para la Gestion de Errores
const { generateError, validateLikes } = require('../../../../helpers')

const likeProduct = async (req, res, next) => {
    //coger el id del usuario que esta logeado
    const lover_id = req.claims.userId
    //coger el id del producto que queremos darle like
    const { product_id } = req.params

    //Validar los datos que recibimos
    try {
        await validateLikes({ product_id })
        console.log('Datos validados')
    } catch (error) {
        return res.status(400).send({
            status: 'Bad Request',
            message: error.details[0].message,
        })
    }

    let connection = null
    //Insertar el like en la DDBB
    try {
        //Conexion con la DDBB
        connection = await getConnection()

        //Para conseguir el user_id del producto al que queremos darle like y comprobar que existe
        const [product] = await connection.query(`
            SELECT user_id FROM products WHERE status IS NULL AND id = ${product_id}`)
        //Comprobar si el producto ya tiene un like de ese lover
        const [like] = await connection.query(`
            SELECT * FROM likes WHERE product_id = ${product_id} AND lover_id = ${lover_id}`)

        if (product.length === 0) {
            throw generateError(
                'Not found. No existe, se compró o se borró el producto',
                404
            )
        } else if (product[0].user_id === lover_id) {
            throw generateError(
                'Coflict. No puedes darle like a tu producto',
                409
            )
        } else if (like.length > 0) {
            throw generateError(
                'Conflict. Ya has dado like a este producto',
                409
            )
        } else {
            //Insertar el like en la DDBB
            await connection.query(
                `INSERT INTO likes (product_id, user_id, lover_id) VALUES (${product_id}, ${product[0].user_id}, ${lover_id})`
            )
            //Calcular el nuevo numero de likes del producto y actualizarlo en la DDBB
            const [totalLikes] = await connection.query(
                `Select COUNT(*) as likes FROM likes WHERE product_id = ${product_id}`
            )
            console.log(`Likes del producto: ${totalLikes[0].likes}`)
            //Calcular el nuevo numero de likes que dio el usuario y actualizarlo en la DDBB
            const [totalLoves] = await connection.query(
                `Select COUNT(*) as loves FROM likes WHERE lover_id = ${lover_id}`
            )
            console.log(
                `Likes dados por el usuario Logueado: ${totalLoves[0].loves}`
            )
            //Calcular el nuevo numero de likes que recibieron los productos del usuario y actualizarlo en la DDBB
            const [totalUserLikes] = await connection.query(
                `Select COUNT(*) as userLikes FROM likes WHERE user_id = ${product[0].user_id}`
            )
            console.log(
                `Likes del dueño del Producto: ${totalUserLikes[0].userLikes}`
            )

            //Actualizar el numero de likes del producto en la DDBB
            await connection.query(
                `UPDATE products SET likes = ${totalLikes[0].likes} WHERE id = ${product_id}`
            )
            //Actualizar el numero de likes que dio el usuario en la DDBB
            await connection.query(
                `UPDATE users SET loves = ${totalLoves[0].loves} WHERE id = ${lover_id}`
            )
            //Actualizar el numero de likes que recibieron los productos del usuario en la DDBB
            await connection.query(
                `UPDATE users SET likes = ${totalUserLikes[0].userLikes} WHERE id = ${product[0].user_id}`
            )
        }

        //Si todo va bien
        return res.status(201).send({
            status: 'Created',
            message: `Like añadido y sumado`,
        })
    } catch (error) {
        next(error)
    } finally {
        if (connection) connection.release()
    }
}

module.exports = likeProduct
