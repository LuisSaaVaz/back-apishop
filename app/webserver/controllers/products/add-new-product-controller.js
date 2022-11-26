'use strict'

const fs = require('fs/promises')
const path = require('path')
const sharp = require('sharp')
const v4 = require('uuid').v4
const { getConnection } = require('../../../db/db')
const Joi = require('joi')

const IMG_VALID_FORMATS = ['jpeg', 'png']
const CATEGORY_VALID = [
    'Desktop',
    'Notebook',
    'Tablet',
    'Smartphone',
    'Smartwatch',
    'Console',
    'Keyboard',
    'Headset',
    'Tv',
]

const MAX_IMAGE_WIDTH = 600


const PROJECT_MAIN_FOLDER_PATH = process.cwd() // ruta de nuestro proyecto
const IMG_FOLDER_PATH = path.join(
    PROJECT_MAIN_FOLDER_PATH,
    'public',
    'uploads',
    'products'
)

// funcion para validar los datos que nos llegan por la req.body
async function validateProduct(product) {
    const schema = Joi.object({
        name: Joi.string().required(),
        category: Joi.string()
            .valid(...CATEGORY_VALID)
            .required(),
        price: Joi.number().required(),
        location: Joi.string().required(),
        caption: Joi.string().required(),
    })

    Joi.assert(product, schema)
}

// funcion para crear un producto en la base de datos
async function addNewProduct(req, res, next) {
    /*
     * 1. Validar los datos tanto de la imagen como de las carecteristicas del producto 👌
     * 2. Crear y guardar si no exite la imagen en un disco duro en este caso el pc 👌
     * 3. hacer una query para limitar el numero de publicaciones por usuario👌
     * 4. hacer la query a la DDBB e insertar el producto 👌
     * 5. Enviarle a front la ruta completa de la imagen 👌
     */

    const userId = req.claims.userId
    const file = req.file

    console.log(file)

    const dataProduct = {
        name: req.body.name,
        price: req.body.price,
        category: req.body.category,
        location: req.body.location,
        caption: req.body.caption,
    }
    console.log(dataProduct)

    try {
        await validateProduct(dataProduct)
    } catch (e) {
        return res.status(400).send({
            status: 'Bad request',
            message: `Este producto no es valido`,
        })
    }
    // Comprobamos que se haya enviado una imagen del producto
    if (!file || !file.buffer) {
        return res.status(400).send({
            status: 'Bad request',
            message: 'Debes introducir una imagen del producto',
        })
    }

    let imageFileName = null
    let connection = null
    try {
        // validamos el formato de la img para que no se metan archivos que no sean jpeg o png
        const image = sharp(file.buffer)
        const metadata = await image.metadata()

        if (!IMG_VALID_FORMATS.includes(metadata.format)) {
            return res.status(400).send({
                status: 'Bad request',
                message: `el formato de la imagen debe ser alguno de los siguientes ${IMG_VALID_FORMATS}`,
            })
        }
        // Si la imagen es muy grande la reajustamos

        if (metadata.width > MAX_IMAGE_WIDTH) {
            image.resize(MAX_IMAGE_WIDTH)
        }
        // para guardar la imagen generamos un nombre aleatorio para asegurarnos que donde la guardemos solo haya 1 y solo 1 con el mismo nombre.

        imageFileName = `${v4()}.${metadata.format}`
        const imageUploadPath = path.join(IMG_FOLDER_PATH, userId.toString())

        // verificamos que el usuario solo pueda hacer un maximo de publicaciones
        connection = await getConnection()
        const [rows] = await connection.query(`SELECT COUNT(*) AS publicaciones
        FROM users u
        JOIN products p ON u.id = p.user_id 
        WHERE u.id = ${userId}
        GROUP BY u.id;`)

        if (!rows) {
            connection.release()
        }

        //Si se quiere limitar el Nº de productos por usuario
        /* const { publicaciones } = rows[0] || 0
        if (publicaciones >= MAX_LIMIT_POST) {
            return res.status(403).send({
                status: 'Denied',
                message: `El limite de publicaciones por usuario son ${MAX_LIMIT_POST}`,
            })
        } */

        connection.release()

        // la ruta total seria =  dir_principal/public/uploads/products/$userId
        await fs.mkdir(imageUploadPath, {
            recursive: true,
        })
        await image.toFile(path.join(imageUploadPath, imageFileName))
    } catch (e) {
        if (connection !== null) {
            connection.release()
        }
        res.status(500).send(e.message)
    }

    try {
        // insertamos el producto en la DDBB
        const now = new Date()

        const product = {
            user_id: userId,
            created_at: now,
            image: imageFileName,
            name: dataProduct.name,
            category: dataProduct.category,
            price: dataProduct.price,
            location: dataProduct.location,
            caption: dataProduct.caption,
        }
        connection = await getConnection()

        await connection.query(`INSERT INTO products SET ?`, product)
        const [row] = await connection.query(
            `SELECT max(id) AS lastIid FROM products`
        )
        console.log(row[0].lastIid)

        //Recuperar el total de productos que tiene el usuario
        const [totalProducts] = await connection.query(
            `SELECT COUNT(*) AS total FROM products WHERE status IS NULL AND user_id = ${userId}`
        )
        //actualizar el total de productos del usuario
        await connection.query(
            `UPDATE users SET products = ${totalProducts[0].total} WHERE id = ${userId}`
        )

        connection.release()
        res.header(
            'location',
            `${process.env.HTTP_SERVER_DOMAIN}/uploads/products/${userId}/${imageFileName}`
        )

        return res.status(201).send({
            status: 'Created',
            message: `El producto ha sido añadido con exito !`,
        })
    } catch (e) {
        if (connection !== null) {
            connection.release()
        }
        console.log(e)
        return res.status(500).send(e.message)
    }finally{
        if (connection !== null) {
            connection.release()
        }
    }
}

module.exports = addNewProduct
