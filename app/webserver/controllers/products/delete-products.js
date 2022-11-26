'use strict'

//Para Borrar directorios y archivos
const fs = require('fs/promises')

//Para gestionar directorios y archivos
const path = require('path')

//Necesitamos conectar con la DDBB
const { getConnection } = require('../../../db/db.js')

//Importar del archivo de la ruta ../helpers.js la Variable que uso para la Gestion de Errores
const { generateError, validateProducts } = require('../../../../helpers.js')

const PROJECT_MAIN_FOLDER_PATH = process.cwd()
const PRODUCTS_FOLDER_PATH = path.join(
  PROJECT_MAIN_FOLDER_PATH,
  'public',
  'uploads',
  'products'
)

/***************************************************************
 ***************************BY ID*******************************
 **************************************************************/

const deleteProductById = async (req, res, next) => {
  let connection = null
  const id = req.params.id
  let idArray = null
  const logUserId = req.claims.userId

  //VALIDACIONES
  try {
    //Si id contiene '-', guardarlo en una variable
    if (id.includes('-')) {
      //Separar el id en un array
      idArray = id.split('-')
      //Comprobar que cada dato cumpla con validateId
      //map para recorrer el array y pasarlo a validateProducts
      idArray.map(async (id) => {
        await validateProducts({ id })
      })
      console.log('Datos validados')
    } else {
      const object = { id: id }
      await validateProducts(object)
      console.log('Dato validado')
    }
  } catch (error) {
    res.status(400).send({
      status: 'bad request',
      message: error.details[0].message,
    })
  }

  //BORRAR PRODUCTOS
  try {
    connection = await getConnection()
    //Coger el id mas grande de la base de datos
    const [maxId] = await connection.query(
      `SELECT MAX(id) AS maxId FROM products`
    )

    if (idArray) {
      let notExist = []
      let adminProduct = []
      let notDelete = []
      let deleteProducts = []
      let userIdProduct = null

      for (let i = 0; i < idArray.length; i++) {
        //Comprobar que existe el producto
        const [product] = await connection.query(
          `SELECT user_id, image FROM products WHERE id=${idArray[i]}`
        )
        if (product.length > 0) {
          //Cojo el user_id del producto para comprobar que el usuario logeado es el dueño del producto
          userIdProduct = product[0].user_id
        }
        //Para comprobar que el status del usuario logueado es admin
        const [logUser] = await connection.query(
          `SELECT status FROM users p WHERE p.id=${logUserId}`
        )
        //Comprobar si el producto es de un admin
        const [adminProductUser] = await connection.query(
          `SELECT id, status FROM users WHERE id=${userIdProduct} AND status='admin'`
        )
        if (product.length === 0) {
          notExist.push(idArray[i])
        } else if (
          adminProductUser[0].status === 'admin' &&
          logUser[0].status !== 'admin'
        ) {
          adminProduct.push(idArray[i])
        } else if (
          userIdProduct !== logUserId &&
          logUser[0].status !== 'admin'
        ) {
          notDelete.push(idArray[i])
        } else {
          deleteProducts.push(idArray[i])
        }
      }
      if (notExist.length > 0) {
        notExist = notExist.join(', ')
        throw generateError(
          `No existen, se borraron o se compraron, debe ser un numero entero entre 1 y ${maxId[0].maxId}`,
          404
        )
      } else if (adminProduct.length > 0) {
        adminProduct = adminProduct.join(', ')
        throw generateError(
          `Forbidden. Los productos con id: ${adminProduct} son de un admin, no se pueden borrar`,
          403
        )
      } else if (notDelete.length > 0) {
        notDelete = notDelete.join(', ')
        throw generateError(
          `No se pueden borrar porque no eres el dueño ni administrador`,
          403
        )
      } else {
        //Para cada elemento comprobar que las carpetas products/${userIdProduct} existe
        deleteProducts.map(async (id) => {
          //Buscar el user_id y el image del producto
          const [product] = await connection.query(
            `SELECT user_id, image FROM products WHERE id=${id}`
          )
          //Buscar los lover_id de cada producto a borrar
          const [lover] = await connection.query(
            `SELECT lover_id FROM likes WHERE product_id=${id}`
          )

          //Creo la ruta del archivo a borrar
          const imageProductPath = path.join(
            PRODUCTS_FOLDER_PATH,
            product[0].user_id.toString(),
            product[0].image
          )

          //Borrar el archivo products/${userIdProduct}/image si existe
          if (fs.access(imageProductPath)) {
            fs.rm(imageProductPath, { recursive: true })
          }
          //Borrar el producto de la base de datos
          await connection.query(`DELETE FROM products WHERE id = (${id})`)

          //Actualizar los likes de cada dueño de un producto borrado
          product.map(async (user_id) => {
            console.log(
              'Esto es user_id cuando se borra mas de 1 producto',
              user_id
            )
            //Recuperar el total de productos que tiene el usuario
            const [totalProducts] = await connection.query(
              `SELECT COUNT(*) AS total FROM products WHERE status IS NULL AND user_id=${user_id}`
            )
            //Actualizar el total de productos que tiene el usuario
            await connection.query(
              `UPDATE users SET products=${totalProducts[0].total} WHERE id=${user_id}`
            )
            //Calcular los likes del dueño del producto
            const [likes] = await connection.query(
              `SELECT COUNT(id) AS likes FROM likes WHERE user_id=${user_id}`
            )
            //Actualizar los likes del dueño del producto
            await connection.query(
              `UPDATE users SET likes=${likes[0].likes} WHERE id=${user_id}`
            )
          })

          //Actualizar los loves de cada lover_id
          lover.map(async (lover_id) => {
            const [loves] = await connection.query(
              `SELECT COUNT(id) AS loves FROM likes WHERE lover_id=${lover_id}`
            )
            //Actualizar los loves de cada lover_id
            await connection.query(
              `UPDATE users SET loves=${loves[0].loves} WHERE id=${lover_id}`
            )
          })
        })

        res.status(200).send({
          status: 'deleted',
          message: `Productos e imágenes borrados, loves y likes actualizados`,
        })
      }
    } else {
      //Comprobamos que exista el producto
      const [product] = await connection.query(
        `SELECT user_id, image FROM products p WHERE p.id=${id}`
      )
      //Buscar los lover_id de cada producto a borrar
      const [lover] = await connection.query(
        `SELECT lover_id FROM likes WHERE product_id=${id}`
      )
      console.log(lover)
      let userIdProduct = null
      let image = null
      if (product.length > 0) {
        //Cojo el user_id del producto para comprobar que el usuario logeado es el dueño del producto
        userIdProduct = product[0].user_id
        //Cojo el image del producto para borrarlo
        image = product[0].image
      }
      //Compruebo que el status del userIdProduct sea admin
      const [adminProductUser] = await connection.query(
        `SELECT status FROM users WHERE id=${userIdProduct}`
      )
      //Comprobamos que el status del usuario logueado es admin
      const [logUser] = await connection.query(
        `SELECT status FROM users p WHERE p.id=${logUserId}`
      )
      if (product.length === 0) {
        throw generateError(
          `No existe, se borró o se compró, debe ser un numero entero entre 1 y ${maxId[0].maxId}`,
          404
        )
      } else if (
        adminProductUser[0].status === 'admin' &&
        logUser[0].status !== 'admin'
      ) {
        throw generateError(
          `No se puede borrar, es de un administrador y tú no lo eres`,
          403
        )
      } else if (userIdProduct !== logUserId && logUser[0].status !== 'admin') {
        throw generateError(
          `No se puede borrar porque no eres el dueño ni administrador`,
          403
        )
      } else {
        //Crear la ruta para el archivo products/${userIdProduct}/image
        const imageProductPath = path.join(
          PRODUCTS_FOLDER_PATH,
          userIdProduct.toString(),
          image
        )

        //Borrar el archivo products/${userIdProduct}/image si existe
        if (fs.access(imageProductPath)) {
          fs.rm(imageProductPath, { recursive: true })
        }
        //Borrar el producto de la base de datos
        await connection.query(`DELETE FROM products WHERE id=${id}`)

        //Recuperar el total de productos que tiene el usuario
        const [totalProducts] = await connection.query(
          `SELECT COUNT(*) AS total FROM products WHERE status IS NULL AND user_id=${userIdProduct}`
        )
        console.log(totalProducts[0].total)
        //Actualizar el total de productos que tiene el usuario
        await connection.query(
          `UPDATE users SET products=${totalProducts[0].total} WHERE id=${userIdProduct}`
        )

        //Actualizar los likes del dueño del producto borrado
        //Calcular los likes del dueño del producto
        const [likes] = await connection.query(
          `SELECT COUNT(id) AS likes FROM likes WHERE user_id=${userIdProduct}`
        )
        //Actualizar los likes del dueño del producto
        await connection.query(
          `UPDATE users SET likes=${likes[0].likes} WHERE id=${userIdProduct}`
        )

        //Actualizar los loves de cada lover_id
        lover.map(async (lover_id) => {
          console.log(lover_id)
          const [loves] = await connection.query(
            `SELECT COUNT(id) AS loves FROM likes WHERE lover_id=${lover_id.lover_id}`
          )
          //Actualizar los loves de cada lover_id
          await connection.query(
            `UPDATE users SET loves=${loves[0].loves} WHERE id=${lover_id.lover_id}`
          )
        })
      }
      //Si todo fue bien
      res.status(200).send({
        status: 'ok',
        message: `Producto borrado`,
      })
    }
  } catch (error) {
    next(error) //Si llega aqui el error se envia al Middleware de gestion de errores
  } finally {
    if (connection) {
      connection.release() //Liberamos la conexion
    }
  }
}

/***************************************************************
 ***********************BY USER ID******************************
 **************************************************************/

const deleteAllProductByUserID = async (req, res, next) => {
  let connection = null

  const user_id = req.params.userId
  console.log(user_id)
  const logUserId = req.claims.userId
  console.log(logUserId)

  try {
    await validateProducts({ user_id })
    console.log('dato validado')
  } catch (error) {
    res.status(400).send({
      status: 'bad request',
      message: error.details[0].message,
    })
  }

  try {
    connection = await getConnection()
    // let deleteProducts = []

    //Compruebo que el usuario tiene productos
    const [products] = await connection.query(
      `SELECT id FROM products WHERE user_id = ${user_id}`
    )

    //Comprobar si el usuario del que se quieren borrar los productos es admin
    const [admin] = await connection.query(
      `SELECT status FROM users WHERE id = ${user_id}`
    )

    //Comprobar si el usuario logueado es admin
    const [user] = await connection.query(
      `SELECT status FROM users WHERE id = ${logUserId}`
    )

    if (products.length === 0) {
      throw generateError(
        `El usuario con id: ${user_id} no tiene productos`,
        404
      )
    } else if (admin[0].status === 'admin') {
      throw generateError(
        `Forbidden. El usuario con id: ${user_id} es un admin, no se pueden borrar sus productos`,
        403
      )
    } else if (user_id !== logUserId && user[0].status !== 'admin') {
      throw generateError(
        `Forbidden. No puedes borrar los productos del usuario con id: ${user_id} porque no eres el dueño ni tienes permisos de administrador`,
        403
      )
    } else {
      const products_id = products.map((product) => product.id)
      products_id.map(async (id) => {
        //Comprobamos que exista el producto
        const [product] = await connection.query(
          `SELECT user_id, image FROM products p WHERE p.id=${id}`
        )
        //Buscar los lover_id de cada producto a borrar
        const [lover] = await connection.query(
          `SELECT lover_id FROM likes WHERE product_id=${id}`
        )

        //Creo la ruta del archivo a borrar
        const imageProductPath = path.join(
          PRODUCTS_FOLDER_PATH,
          product[0].user_id.toString(),
          product[0].image
        )

        //Borrar el archivo products/${userIdProduct}/image si existe
        if (fs.access(imageProductPath)) {
          fs.rm(imageProductPath, { recursive: true })
        }
        //Borrar el producto de la base de datos
        await connection.query(`DELETE FROM products WHERE id = (${id})`)

        //Actualizar los loves de cada lover_id
        lover.map(async (lover_id) => {
          const [loves] = await connection.query(
            `SELECT COUNT(id) AS loves FROM likes WHERE lover_id=${lover_id}`
          )
          //Actualizar los loves de cada lover_id
          await connection.query(
            `UPDATE users SET loves=${loves[0].loves} WHERE id=${lover_id}`
          )
        })
      })

      //Recuperar el total de productos que tiene el usuario
      const [totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products WHERE status IS NULL user_id=${user_id}`
      )
      //Actualizar el total de productos que tiene el usuario
      await connection.query(
        `UPDATE users SET products=${totalProducts[0].total} WHERE id=${user_id}`
      )

      //Calcular los likes del dueño del producto
      const [likes] = await connection.query(
        `SELECT COUNT(id) AS likes FROM products WHERE user_id=${user_id}`
      )
      //Actualizar los likes del dueño del producto
      await connection.query(
        `UPDATE users SET likes=${likes[0].likes} WHERE id=${user_id}`
      )

      res.status(200).send({
        status: 'ok',
        message: `Productos borrados`,
      })
    }
  } catch (error) {
    next(error) //Si llega aqui el error se envia al Middleware de gestion de errores
  } finally {
    if (connection) {
      connection.release() //Liberamos la conexion
    }
  }
}

/***************************************************************
 *************************BY ADMIN******************************
 **************************************************************/
const deleteAllProductByAdmin = async (req, res, next) => {
  let connection = null
  const logUserId = req.claims.userId
  try {
    connection = await getConnection()
    //let deleteProducts = []

    const [products] = await connection.query(`SELECT id FROM products`)
    //Compruebo que el usuario tiene status admin
    const [logUser] = await connection.query(
      `SELECT status FROM users WHERE id = ${logUserId}`
    )
    //Consigo los usuarios que no son admin
    const [usersNoAdmin] = await connection.query(
      `SELECT id FROM users WHERE status = 'active'`
    )
    console.log(usersNoAdmin.length)
    /* const [productsNoBooking] = await connection.query(
            `SELECT id FROM products WHERE status IS NULL`
        ) */

    if (products.length === 0) {
      throw generateError(`Not found. No hay productos para borrar`, 404)
    } /* else if (productsNoBooking.length === 0) {
            throw generateError('Not found. No hay productos para borrar que no estén en bookings', 404)
        }  */ else if (logUser[0].status !== 'admin') {
      throw generateError(
        'Forbidden. No tienes permisos de administrador para borrar productos de otros usuarios',
        403
      )
    } else {
      const usersNoAdmin_id = usersNoAdmin.map((user) => user.id)
      console.log(usersNoAdmin_id)
      usersNoAdmin_id.map(async (id) => {
        const [products] = await connection.query(
          `SELECT id FROM products WHERE user_id = ${id}`
        )
        console.log(products.length)
        if (products.length > 0) {
          const products_id = products.map((product) => product.id)
          products_id.map(async (id) => {
            const [product] = await connection.query(
              `SELECT user_id, image FROM products p WHERE p.id=${id}`
            )
            //Buscar los lover_id de cada producto a borrar
            const [lover] = await connection.query(
              `SELECT lover_id FROM likes WHERE product_id=${id}`
            )
            const imageProductPath = path.join(
              PRODUCTS_FOLDER_PATH,
              product[0].user_id.toString(),
              product[0].image
            )
            //Borrar el archivo products/${userIdProduct}/image si existe
            if (fs.access(imageProductPath)) {
              fs.rm(imageProductPath, { recursive: true })
            }
            //Borrar el producto de la base de datos
            await connection.query(`DELETE FROM products WHERE id = (${id})`)
            //Actualizar los loves de cada lover_id
            lover.map(async (lover_id) => {
              const [loves] = await connection.query(
                `SELECT COUNT(id) AS loves FROM likes WHERE lover_id=${lover_id}`
              )
              //Actualizar los loves de cada lover_id
              await connection.query(
                `UPDATE users SET loves=${loves[0].loves} WHERE id=${lover_id}`
              )
            })
          })
          //Calcular los likes del dueño del producto
          const [likes] = await connection.query(
            `SELECT COUNT(id) AS likes FROM products WHERE user_id=${id}`
          )
          //Actualizar los likes del dueño del producto
          await connection.query(
            `UPDATE users SET likes=${likes[0].likes} WHERE id=${id}`
          )
        } else {
          throw generateError(`Not found. No hay productos para borrar`, 404)
        }
      })

      res.status(200).send({
        status: 'ok',
        message: `Productos borrados`,
      })
    }
  } catch (error) {
    next(error) //Si llega aqui el error se envia al Middleware de gestion de errores
  } finally {
    if (connection) {
      connection.release() //Liberamos la conexion
    }
  }
}

module.exports = {
  deleteProductById,
  deleteAllProductByUserID,
  deleteAllProductByAdmin,
}
