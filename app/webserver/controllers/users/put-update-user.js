'use strict'

const v4 = require('uuid').v4 //Generar un id aleatorio
const fs = require('fs/promises') //Crear el directorio y subir la imagen
const sharp = require('sharp') //Validar el formato de la imagen
const path = require('path') //Crear una ruta

const { getConnection } = require('../../../db/db.js') //Necesitamos conectar con la DDBB
const { generateError, validateUsers } = require('../../../../helpers') //Variable que uso para la Gestion de Errores

// Limites y Ruta para actualizar los datos del usuario pudiendo modificar el nombre y la posibilidad de añadir biografia y avatar.
const IMG_VALID_FORMATS = ['jpeg', 'png']
const MAX_IMAGE_WIDTH = 600
const PROJECT_MAIN_FOLDER_PATH = process.cwd() // ruta de nuestro proyecto
const IMG_FOLDER_PATH = path.join(
    PROJECT_MAIN_FOLDER_PATH,
    'public',
    'uploads',
    'users'
)

const putUpdateUserInfo = async (req, res, next) => {
    //Recogemos los datos que nos llegan
    const logUserId = req.claims.userId
    console.log(logUserId)
    const payload = { ...req.body }
    console.log(req.body)
    let connection = null

    //VALIDAR LOS DATOS
    try {
        await validateUsers(payload)
    } catch (error) {
        return res.status(400).send({
            status: 'Bad Request',
            message: error.details[0].message,
        })
    }

    //ACTUALIZAR EL USUARIO
    try {
        connection = await getConnection()

        let query
        // const query = 'UPDATE users SET name = ?, bio = ? WHERE id = ?' //Query para actualizar el usuario
        // const values = [name, bio, logUserId] //Valores para la query
        const { name, bio } = payload //Recogemos en variables los datos que nos llegan
        /* if (bio.length > 0) {
            query = 'UPDATE users SET name = ?, bio = ? WHERE id = ?' //Query para actualizar el usuario
            values = [name, bio, logUserId] //Valores para la query
        } else {
            query = 'UPDATE users SET name = ? bio IS NULL WHERE id = ?' //Query para actualizar el usuario
            values = [name, logUserId] //Valores para la query
        } */
        bio
            ? (query = `UPDATE users SET name = '${name}', bio = '${bio}' WHERE id = ${logUserId}`)
            : (query = `UPDATE users SET name = '${name}', bio ='' WHERE id = ${logUserId}`)

        const [result] = await connection.query(query)

        //Comprobar si se ha actualizado el usuario
        if (result.affectedRows === 0) {
            throw generateError(
                `Bad request. No se ha podido actualizar el usuario con id: ${logUserId}`,
                400
            )
        }
        res.status(200).send({
            status: 'Ok',
            message: `Usuario actualizado`,
        })
    } catch (error) {
        next(error)
    } finally {
        if (connection) {
            connection.release()
        }
        res.end(0)
    }
}

const putUpdateUserStatus = async (req, res, next) => {
    //Recogemos los datos que nos llegan
    const logUserId = req.claims.userId
    console.log(logUserId)
    const userId = req.params.id
    const payload = { ...req.body, id: userId }
    console.log(payload)
    let connection = null

    //VALIDAR LOS DATOS
    try {
        await validateUsers(payload)
    } catch (error) {
        return res.status(400).send({
            status: 'Bad Request',
            message: error.details[0].message,
        })
    }

    //ACTUALIZAR EL USUARIO
    try {
        connection = await getConnection()

        const { status } = payload //Recogemos en variables los datos que nos llegan
        const query = 'UPDATE users SET status = ? WHERE id = ?' //Query para actualizar el usuario
        const values = [status, userId] //Valores para la query
        let result = []

        // Comprobar si el usuario con userId existe
        const [user] = await connection.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        )

        //Comprobar si el usuario con userId tiene status active
        const [userStatus] = await connection.query(
            'SELECT status FROM users WHERE id = ?',
            [userId]
        )

        //Comprobar si el usuario con logUserId es admin
        const [admin] = await connection.query(
            'SELECT status FROM users WHERE id = ?',
            [logUserId]
        )

        if (user.length === 0) {
            throw generateError(
                `Not Found. El usuario con id: ${userId} no existe en la base de datos`,
                404
            )
        } else if (userStatus[0].status !== 'active') {
            throw generateError(
                `Bad Request. El usuario con id: ${userId} no tiene status active`
            )
        } else if (admin[0].status !== 'admin') {
            throw generateError(
                `Bad request. El usuario con id: ${logUserId} no es administrador`,
                400
            )
        } else {
            result = await connection.query(query, values)
        }

        //Comprobar si se ha actualizado el usuario
        if (result.affectedRows === 0) {
            throw generateError(
                `Bad request. No se ha podido actualizar el usuario con id: ${userId}`,
                400
            )
        }
        res.status(200).send({
            status: 'Ok',
            message: `Usuario actualizado`,
        })
    } catch (error) {
        next(error)
    } finally {
        if (connection) {
            connection.release()
        }
        res.end(0)
    }
}

const putUpdateUserAvatar = async (req, res, next) => {
    const userId = req.claims.userId
    const file = req.file
    let imageFileName = null
    let imageUploadPath = null
    let image = null
    let metadata = null

    let connection = null
    //VALIDAR LA IMAGEN, RESIZE, RENOMBRARLA Y RUTA
    try {
        //Validar el formato de la imagen
        image = sharp(file.buffer) //Recogemos los datos de la imagen
        metadata = await image.metadata() //Metadatos de la imagen para validar el formato
        if (!IMG_VALID_FORMATS.includes(metadata.format)) {
            return res.status(400).send({
                status: 'error',
                message: `El formato de la imagen debe ser: ${IMG_VALID_FORMATS}`,
            })
            /* throw generateError(
                `El formato de la imagen debe ser: ${IMG_VALID_FORMATS}`,
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
    } catch (error) {
        return res.status(500).send(error.message)
    }

    //ACTUALIZAR EL AVATAR DEL USUARIO
    try {
        connection = await getConnection()

        const query = 'UPDATE users SET avatar = ? WHERE id = ?'
        const values = [imageFileName, userId]
        const [result] = await connection.query(query, values)
        if (result.affectedRows === 0) {
            throw generateError(
                `Bad request. No se ha podido actualizar el usuario con id: ${userId}`,
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
            message: 'Avatar actualizado',
        })
    } catch (error) {
        next(error)
    } finally {
        if (connection !==  null) {
            connection.release()
        }
        res.end(0)
    }
}
module.exports = { putUpdateUserInfo, putUpdateUserStatus, putUpdateUserAvatar }
