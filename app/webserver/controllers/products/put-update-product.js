'use strict'

const v4 = require('uuid').v4 //Generar un id aleatorio
const fs = require('fs/promises') //Crear el directorio y subir la imagen
const sharp = require('sharp') //Validar el formato de la imagen
const path = require('path') //Crear una ruta

const { getConnection } = require('../../../db/db.js') //Necesitamos conectar con la DDBB
const { generateError, validateProducts } = require('../../../../helpers') //Variable que uso para la Gestion de Errores

// Limites y Ruta para actualizar los datos del usuario pudiendo modificar el nombre y la posibilidad de añadir biografia y avatar.
const IMG_VALID_FORMATS = ['jpeg', 'png']
const MAX_IMAGE_WIDTH = 600
const PROJECT_MAIN_FOLDER_PATH = process.cwd() // ruta de nuestro proyecto
const IMG_FOLDER_PATH = path.join(
    PROJECT_MAIN_FOLDER_PATH,
    'public',
    'uploads',
    'products'
)

const putUpdateProductInfo = async (req, res, next) => {
    //Recogemos los datos que nos llegan
    const id = req.params.id
    const logUserId = req.claims.userId
    const payload = { ...req.body }
    console.log(payload)
    let connection = null

    //VALIDACIONES
    try {
        await validateProducts({ ...payload, id })
        console.log('Datos validados')
    } catch (error) {
        return res.status(400).send({
            status: 'Bad Request',
            message: error.details[0].message,
        })
    }

    //ACTUALIZAR EL PRODUCTO
    try {
        connection = await getConnection()

        //Comprobar si el usuario es el dueño del producto
        const [product] = await connection.query(
            'SELECT user_id FROM products WHERE status IS NULL AND id = ?',
            [id]
        )
        //Comprobar si el usuario es admin
        const [user] = await connection.query(
            'SELECT status FROM users WHERE id = ?',
            [logUserId]
        )

        if (product.length === 0) {
            throw generateError(
                `Bad request. No existe, se borró o se vendió el producto con id: ${id}`,
                400
            )
        } else if (
            product[0].user_id !== logUserId &&
            user[0].status !== 'admin'
        ) {
            throw generateError(
                `Forbidden. No eres el dueño o no tienes permisos de administrador para actualizar este producto.`,
                403
            )
        } else {
            const { name, category, location, price, caption } = payload //Recogemos en variables los datos que nos llegan
            let query =
                'UPDATE products SET name = ?, category = ?, location = ?, price = ?, caption = ? WHERE id = ?' //Query para actualizar el usuario
            const values = [name, category, location, price, caption, id] //Valores para la query
            const [result] = await connection.query(query, values)
            //Comprobar si se ha actualizado el producto
            if (result.affectedRows === 0) {
                throw generateError(
                    `Bad request. No se ha actualizado el producto ${id}`,
                    400
                )
            }
        }

        //Si todo fue bien
        return res.status(200).send({
            status: 'Ok',
            message: 'Producto actualizado',
        })
    } catch (error) {
        next(error)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

const putUpdateProductImage = async (req, res, next) => {
    const logUserId = req.claims.userId
    const id = req.params.id
    const userId = req.params.userId
    const file = req.file
    let imageFileName = null
    let imageUploadPath = null
    let image = null
    let metadata = null

    let connection = null
    //VALIDAR LA IMAGEN, RESIZE, RENOMBRARLA Y RUTA
    try {
        if (file) {
            //Validar el formato de la imagen
            image = sharp(file.buffer) //Recogemos los datos de la imagen
            metadata = await image.metadata() //Metadatos de la imagen para validar el formato
            if (!IMG_VALID_FORMATS.includes(metadata.format)) {
                return res.status(400).send({
                    status: 'error',
                    message: `El formato de la imagen debe ser: ${IMG_VALID_FORMATS}`,
                })
                /* throw generateError(
                    `Bad request. El formato de la imagen debe ser alguno de los siguientes: ${IMG_VALID_FORMATS}`,
                    400
                ) */
            } else {
                //Validar el tamaño de la imagen
                if (metadata.width > MAX_IMAGE_WIDTH) {
                    image.resize(MAX_IMAGE_WIDTH)
                }

                //Crear un nombre aleatorio para la imagen
                imageFileName = `${v4()}.${metadata.format}`

                //Ruta para guardar la imagen en el disco duro
                imageUploadPath = path.join(IMG_FOLDER_PATH, userId.toString()) //ruta de la imagen
            }
        } else {
            throw generateError(
                'Not Found. No se ha subido ninguna imagen',
                404
            )
        }
    } catch (error) {
        next(error)
    }

    //ACTUALIZAR LA IMAGEN DEL PRODUCTO
    try {
        connection = await getConnection()
        const query = 'UPDATE products SET image = ? WHERE id = ?'
        const values = [imageFileName, id]
        const [result] = await connection.query(query, values)
        if (result.affectedRows === 0) {
            throw generateError(
                `Bad request. No se ha podido actualizar el producto con id: ${id}`,
                400
            )
        }
        //Crear la ruta para la imagen
        await fs.mkdir(imageUploadPath, { recursive: true })
        //Guardar la imagen en el disco duro
        await image.toFile(path.join(imageUploadPath, imageFileName))

        //Si todo fue bien
        res.status(200).send({
            status: 'Ok',
            message: 'Imagen actualizada',
        })
    } catch (error) {
        next(error)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

module.exports = { putUpdateProductInfo, putUpdateProductImage }
