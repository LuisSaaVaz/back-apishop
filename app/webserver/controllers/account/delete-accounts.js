'use strict'

//Para Borrar directorios y archivos
const fs = require('fs/promises')

//Para gestionar directorios y archivos
const path = require('path')

//Necesitamos conectar con la DDBB
const { getConnection } = require('../../../db/db.js')

//Importar del archivo de la ruta ../helpers.js la Variable que uso para la Gestion de Errores
const { generateError, validateUsers } = require('../../../../helpers.js')

const PROJECT_MAIN_FOLDER_PATH = process.cwd()
const PRODUCTS_FOLDER_PATH = path.join(PROJECT_MAIN_FOLDER_PATH, 'public', 'uploads', 'products')
const USERS_FOLDER_PATH = path.join(PROJECT_MAIN_FOLDER_PATH, 'public', 'uploads', 'users')
/***************************************************************
 *************************MY ACCOUNT****************************
 **************************************************************/

const deleteMyAccount = async (req, res, next) => {
    let connection = null
    const logUserId = req.claims.userId
    try {
        connection = await getConnection()
        const productPath = path.join(PRODUCTS_FOLDER_PATH, logUserId.toString())
        const userPath = path.join(USERS_FOLDER_PATH, logUserId.toString())
        //Borramos la carpeta public/uploads/products/${logUserId} si existe
        if (fs.access(productPath)) {fs.rm(productPath, { recursive: true })}
        //Borramos la carpeta public/uploads/users/${logUserId} si existe
        if (fs.access(userPath)) {fs.rm(userPath, { recursive: true })}
        //Borramos el usuario de la DDBB
        await connection.query('DELETE FROM users WHERE id = ?', [logUserId])
        //Si todo fue bien
        res.status(200).send('Usuario borrado')
    } catch (error) {
        next(error)
    } finally {
        if (connection) connection.release()
    }
}

/***************************************************************
 ****************************BY ID******************************
 **************************************************************/

/* async function validateId(payload) {
    const schema = Joi.object({
        id: Joi.number().min(1).required(),
    })

    Joi.assert(payload, schema)
} */

const deleteAccountById = async (req, res, next) => {
    let connection = null
    const id = req.params.id
    let idArray = null
    console.log(id)
    const logUserId = req.claims.userId

    //VALIDACIONES
    try {
        //Si id contiene '-', guardarlo en una variable
        if (id.includes('-')) {
            //Separar el id en un array
            idArray = id.split('-')
            //Comprobar que cada dato cumpla con validateId
            for (let i = 0; i < idArray.length; i++) {
                //const object = { id: idArray[i] }
                await validateUsers({ id: idArray[i] })
                console.log('Datos validos');
            }
            console.log('Datos validados')
        } else {
            //const object = { id: id }
            await validateUsers(id)
            console.log('Dato validado')
        }
    } catch (error) {
        res.status(400).send({
            status: 'bad request',
            message: error.details[0].message,
        })
    }
    try {
        connection = await getConnection()
        let notExist = []
        let admin = []
        let deleteUsers = []
        //Coger el id mas grande de la base de datos
        const [maxId] = await connection.query(
            `SELECT MAX(id) AS maxId FROM users`
        )
        //Comprobar que el logUserId tenga status admin
        const [user] = await connection.query(
            `SELECT status FROM users p WHERE p.id=${logUserId}`
        )
        if (user[0].status === 'admin') {
            if (idArray) {
                //Para cada elemento de idArray, comprobar que existe el usuario
                for (let i = 0; i < idArray.length; i++) {
                    const [user] = await connection.query(
                        `SELECT id, status FROM users p WHERE p.id=${idArray[i]}`
                    )
                    if (user.length === 0) {
                        notExist.push(idArray[i])
                    } else if (user.status === 'admin') {
                        admin.push(idArray[i])
                    } else {
                        deleteUsers.push(idArray[i])
                    }
                }
                if (notExist.length > 0) {
                    notExist = notExist.join(', ')
                    throw generateError(
                        `Not Found. Los usuarios con id: ${notExist} no existen o se borraron, debe ser un numero entero entre 1 y ${maxId[0].maxId}`,
                        400
                    )
                } else if (admin.length > 0) {
                    admin = admin.join(', ')
                    throw generateError(
                        `Bad Request. Los usuarios con id: ${admin} son administradores, no se pueden borrar`,
                        400
                    )
                } else {
                    //Comprobar que las carpetas users/${id} y products/${id} existen y si existen borralas
                    for (let i = 0; i < deleteUsers.length; i++) {
                        const productPath = path.join(PRODUCTS_FOLDER_PATH, deleteUsers[i].toString())
                        const userPath = path.join(USERS_FOLDER_PATH, deleteUsers[i].toString())
                        if (fs.access(productPath)) {fs.rm(productPath, { recursive: true })}
                        if (fs.access(userPath)) {fs.rm(userPath, { recursive: true })}
                        //Borrar el usuario de la DDBB
                        await connection.query('DELETE FROM users WHERE id = ?', [deleteUsers[i]])
                    }
                }
                res.status(200).send('Usuarios y Rutas de imagenes borrados')
            } else {
                //Comprobar que el id existe
                const [user] = await connection.query(
                    `SELECT id, status FROM users p WHERE p.id=${id}`
                )
                if (user.length === 0) {
                    throw generateError(`El usuario con id: ${id} no existe`, 400 )
                } else if (user.status === 'admin') {
                    throw generateError(`El usuario con id: ${id} es administrador, no se puede borrar`, 400 )
                } else {
                    const productPath = path.join(PRODUCTS_FOLDER_PATH, id.toString())
                    const userPath = path.join(USERS_FOLDER_PATH, id.toString())
                    //Comprobar que las carpetas users/${id} y products/${id} existen y si existen borralas
                    if (fs.access(productPath)) {fs.rm(productPath, { recursive: true })}
                    if (fs.access(userPath)) {fs.rm(userPath, { recursive: true })}
                    //Borrar el usuario de la DDBB
                    await connection.query('DELETE FROM users WHERE id = ?', [id])
                }
                res.status(200).send('Usuario borrado')
            }
        } else {
            throw generateError(
                `El usuario con id: ${logUserId} no es administrador, no puede borrar otros usuarios`,
                400
            )
        }
    } catch (error) {
        next(error)
    } finally {
        if (connection) connection.release()
    }
}

/***************************************************************
 **************************BY ADMIN*****************************
 **************************************************************/

const deleteAllAccountsByAdmin = async (req, res, next) => {
    let connection = null
    //Conseguir el id del usuario logueado
    const logUserId = req.claims.userId
    console.log(logUserId)
    try {
        connection = await getConnection()
        //Comprobar que el logUserId tenga status admin
        const [user] = await connection.query(
            `SELECT status FROM users  WHERE id=${logUserId}`
        )
        if (user[0].status === 'admin') {
            //Select todos los usuarios que no tengan status admin
            const [users] = await connection.query(
                `SELECT id FROM users WHERE status IS NULL OR status = 'active'`
            )
            console.log(users)

            //Comprobar que las carpetas products/${id} y users/${id} existen y si existen borralas
            for (let i = 0; i < users.length; i++) {
                const productPath = path.join(PRODUCTS_FOLDER_PATH, users[i].id.toString())
                const userPath = path.join(USERS_FOLDER_PATH, users[i].id.toString())
                if (fs.access(productPath)) {fs.rm(productPath, { recursive: true })}
                if (fs.access(userPath)) {fs.rm(userPath, { recursive: true })}
            }
            //Borrar los usuarios que no tengan status admin
            await connection.query(`DELETE FROM users WHERE status IS NULL OR status = 'active'`)
        } else {
            throw generateError(
                `El usuario con id: ${logUserId} no es administrador, no puede borrar otros usuarios`,
                400
            )
        }
        //Si todo fue bien
        res.status(200).send(`Usuarios borrados`)
    } catch (error) {
        next(error)
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { deleteMyAccount, deleteAccountById, deleteAllAccountsByAdmin }
