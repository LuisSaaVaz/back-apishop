'use strict'

//Necesitamos conectar con la DDBB
const { getConnection } = require('../../../db/db.js')

//Importar del archivo de la ruta ../helpers.js la Variable que uso para la Gestion de Errores
const {
  generateError,
  validateLikes,
  pagination,
  createLikesFilter,
  createProductFilter,
} = require('../../../../helpers')

const MAX_LIKES_PER_PAGE = 10

/***************************************************************
 ****************************ALL********************************
 **************************************************************/

const getAllLikes = async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1 //Pagina recibida por querystring o por defecto 1
  const offset = (page - 1) * MAX_LIKES_PER_PAGE //Registros que se saltaran
  let connection = null
  try {
    if (page) {
      await validateLikes({ page })
      console.log('Datos validos')
    }
  } catch (error) {
    return res.status(400).send({
      status: 'Bad Request',
      message: error.details[0].message,
    })
  }
  try {
    connection = await getConnection()

    let queryStrings = []
    let [totalLikes] = await connection.query(
      `SELECT COUNT(*) AS total FROM likes`
    )
    totalLikes = totalLikes[0].total
    const totalPages = Math.ceil(totalLikes / MAX_LIKES_PER_PAGE)
    console.log(page, totalPages)
    const [allLikes] = await connection.query(
      `SELECT id, product_id, user_id, lover_id FROM likes LIMIT ${MAX_LIKES_PER_PAGE} OFFSET ${offset}`
    )

    if (totalLikes === 0) {
      throw generateError('No tienes favoritos', 404)
    } else if (page > totalPages) {
      throw generateError(
        `Not found. No existe la pagina ${page}, van del 1 al ${totalPages}`,
        404
      )
    } else {
      const urlBase = `http://${req.headers.host}/api/likes`
      return res
        .status(200)
        .send(
          await pagination(
            urlBase,
            page,
            totalPages,
            totalLikes,
            offset,
            allLikes,
            queryStrings
          )
        )
    }
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

const getLikesByProductId = async (req, res, next) => {
  let connection = null

  //DATOS DE LA PETICION
  const product_id = req.params.product_id
  req.claims = { ...req.query }
  const data = { ...req.claims }

  //PARA LA PAGINACION
  const page = parseInt(req.query.page, 10) || 1 //Pagina recibida por querystring o por defecto 1
  const offset = (page - 1) * MAX_LIKES_PER_PAGE //Registros que se saltaran

  //VALIDACIONES
  try {
    await validateLikes({ ...data, product_id })
    console.log('Datos validos')
  } catch (error) {
    return res.status(400).send({
      status: 'Bad Request',
      message: error.details[0].message,
    })
  }
  try {
    connection = await getConnection()
    let conditions = []
    let queryStrings = []
    let query = `SELECT p.id, p.image, p.price, p.name, p.category, p.location, p.caption FROM Likes l RIGHT JOIN products p ON l.product_id=p.id WHERE product_id = ${product_id}`

    //Meter en query, conditions y queryStrings los elementos del objeto que devuelve la funcion createLikesFilter
    const result = await createLikesFilter(
      data,
      query,
      conditions,
      queryStrings
    )
    query = result.query
    conditions = result.conditions
    queryStrings = result.queryStrings

    let totalLikes = null
    //Cojo el total de productos que hay en la base de datos
    if (conditions.length > 0) {
      ;[totalLikes] = await connection.query(
        `SELECT COUNT(*) AS total FROM likes WHERE product_id = ${product_id} AND ${conditions.join(
          ' AND '
        )}`
      )
      totalLikes = totalLikes[0].total
    } else {
      ;[totalLikes] = await connection.query(
        `SELECT COUNT(*) AS total FROM likes WHERE product_id = ${product_id}`
      )
      totalLikes = totalLikes[0].total
    }

    //Cojo el total de paginas que hay en la base de datos
    const totalPages = Math.ceil(totalLikes / MAX_LIKES_PER_PAGE)

    //Cojo todos los likes resultantes de la consulta
    const [likes] = await connection.query(
      `${query} LIMIT ${MAX_LIKES_PER_PAGE} OFFSET ${offset}`
    )

    if (totalLikes === 0) {
      throw generateError(
        `Not found. No hay likes del producto con id: ${product_id}`,
        404
      )
    } else if (page > totalPages) {
      throw generateError(
        `Not found. No existe la pagina ${page}, van del 1 al ${totalPages}`,
        404
      )
    } else {
      const urlBase = `http://${req.headers.host}/api/likes/filterBy/productId/${product_id}`
      return res
        .status(200)
        .send(
          await pagination(
            urlBase,
            page,
            totalPages,
            totalLikes,
            offset,
            likes,
            queryStrings
          )
        )
    }
  } catch (error) {
    next(error)
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

/***************************************************************
 *************************BY USER ID****************************
 **************************************************************/

const getLikesByUserId = async (req, res, next) => {
  const user_id = req.params.user_id
  const page = parseInt(req.query.page, 10) || 1 //Pagina recibida por querystring o por defecto 1
  const offset = (page - 1) * MAX_LIKES_PER_PAGE //Registros que se saltaran

  let connection = null
  try {
    await validateLikes({ user_id, page })
    console.log('Datos validados')
  } catch (error) {
    return res.status(400).send({
      status: 'Bad Request',
      message: error.details[0].message,
    })
  }
  try {
    connection = await getConnection()
    let queryStrings = []
    let [totalLikes] = await connection.query(
      `SELECT COUNT(*) AS total FROM likes WHERE user_id = ${user_id}`
    )
    totalLikes = totalLikes[0].total
    const totalPages = Math.ceil(totalLikes / MAX_LIKES_PER_PAGE)
    const [likes] = await connection.query(
      `SELECT p.id, p.image, p.price, p.name, p.category, p.location, p.caption FROM Likes l RIGHT JOIN products p ON l.product_id=p.id WHERE user_id = ${user_id} LIMIT ${MAX_LIKES_PER_PAGE} OFFSET ${offset}`
    )

    if (totalLikes === 0) {
      throw generateError(
        `Not found. No hay productos con likes del usuario: ${user_id}`,
        404
      )
    } else if (page > totalPages) {
      throw generateError(
        `Not found. No existe la pagina ${page}, van del 1 al ${totalPages}`,
        404
      )
    } else {
      const urlBase = `http://${req.headers.host}/api/likes/filterBy/userId/${user_id}`

      console.log(
        (urlBase,
        Number(page),
        totalPages,
        totalLikes,
        offset,
        likes,
        queryStrings)
      )
      return res
        .status(200)
        .send(
          await pagination(
            urlBase,
            Number(page),
            totalPages,
            totalLikes,
            offset,
            likes,
            queryStrings
          )
        )
    }
  } catch (error) {
    next(error)
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

/***************************************************************
 ************************BY LOVER ID****************************
 **************************************************************/

/* const getLikesByLoverId = async (req, res, next) => {
  const lover_id = +req.params.lover_id
  const page = req.query.page || 1
  const offset = (page - 1) * MAX_LIKES_PER_PAGE
  //recuperar el userId del usuario de los claims
  const logUser = req.claims.userId
  console.log('dato del id del usuario registrado', logUser)
  console.log('Comparativa: ', lover_id === logUser)

  let connection = null
  try {
    await validateLikes({ lover_id, page })
    console.log('Datos validados')
  } catch (error) {
    return res.status(400).send({
      status: 'Bad Request',
      message: error.details[0].message,
    })
  }
  try {
    connection = await getConnection()
    let queryStrings = []
    let [totalLikes] = await connection.query(
      `SELECT COUNT(*) AS total FROM likes WHERE lover_id = ${lover_id}`
    )
    totalLikes = totalLikes[0].total

    const totalPages = Math.ceil(totalLikes / MAX_LIKES_PER_PAGE)
    const [likes] = await connection.query(
      `SELECT p.id, p.image, p.price, p.name, p.category, p.location, p.caption, p.user_id FROM Likes l RIGHT JOIN products p ON l.product_id=p.id WHERE lover_id = ${lover_id} AND status IS NULL LIMIT ${MAX_LIKES_PER_PAGE} OFFSET ${offset}`
    )

    if (lover_id !== logUser) {
      throw generateError('No tienes permisos para ver esta información', 403)
    } else if (totalLikes === 0) {
      throw generateError('No tienes productos en favoritos', 404)
    } else if (page > totalPages) {
      throw generateError(
        `No existe la pagina ${page}, van del 1 al ${totalPages}`,
        404
      )
    } else {
      const urlBase = `http://${req.headers.host}/api/likes/filterBy/loverId/${lover_id}`
      return res
        .status(200)
        .send(
          await pagination(
            urlBase,
            Number(page),
            totalPages,
            totalLikes,
            offset,
            likes,
            queryStrings
          )
        )
    }
  } catch (error) {
    next(error)
  } finally {
    if (connection) {
      connection.release()
    }
  }
} */

const getLikesByLoverId = async (req, res, next) => {
  const lover_id = +req.params.lover_id

  // req.claims = { ...req.query } //req.claims es un objeto con los datos de la consulta de la url
  const data = { ...req.query }

  //PARA LA PAGINACION
  const page = req.query.page || 1
  const offset = (page - 1) * MAX_LIKES_PER_PAGE
  //recuperar el userId del usuario de los claims
  const logUser = req.claims.userId
  console.log('dato del id del usuario registrado', logUser)
  console.log('Comparativa: ', lover_id === logUser)

  let connection = null
  try {
    await validateLikes({ lover_id, page })
    console.log('Datos validados')
  } catch (error) {
    return res.status(400).send({
      status: 'Bad Request',
      message: error.details[0].message,
    })
  }
  try {
    connection = await getConnection()
    let conditions = []
    let queryStrings = []
    let query = `SELECT p.id, p.image, p.price, p.name, p.category, p.location, p.caption, p.user_id  FROM Likes l RIGHT JOIN products p ON l.product_id=p.id WHERE p.status IS NULL AND l.lover_id = ${lover_id}`

    console.log('query', query)

    //Meter en query, conditions y queryStrings los elementos del objeto que devuelve la funcion createProductFilter
    const result = await createProductFilter(
      data,
      query,
      queryStrings,
      conditions
    )
    query = result.query
    queryStrings = result.queryStrings
    conditions = result.conditions

    let totalLikes = null
    if (conditions.length > 0) {
      ;[totalLikes] = await connection.query(
        `SELECT COUNT(*) AS total FROM likes l RIGHT JOIN products p ON l.product_id=p.id WHERE p.status IS NULL AND lover_id = ${lover_id} AND ${conditions.join(
          ' AND '
        )}`
      )
      totalLikes = totalLikes[0].total
    } else {
      ;[totalLikes] = await connection.query(
        `SELECT COUNT(*) AS total FROM likes l RIGHT JOIN products p ON l.product_id=p.id WHERE p.status IS NULL AND lover_id = ${lover_id}`
      )
      totalLikes = totalLikes[0].total
    }

    const totalPages = Math.ceil(totalLikes / MAX_LIKES_PER_PAGE)
    const [likes] = await connection.query(
      `${query} LIMIT ${MAX_LIKES_PER_PAGE} OFFSET ${offset}`
    )

    if (lover_id !== logUser) {
      throw generateError('No tienes permisos para ver esta información', 403)
    } else if (totalLikes === 0) {
      throw generateError('No tienes productos en favoritos', 404)
    } else if (page > totalPages) {
      throw generateError(
        `No existe la pagina ${page}, van del 1 al ${totalPages}`,
        404
      )
    } else {
      const urlBase = `http://${req.headers.host}/api/likes/filterBy/loverId/${lover_id}`
      return res
        .status(200)
        .send(
          await pagination(
            urlBase,
            Number(page),
            totalPages,
            totalLikes,
            offset,
            likes,
            queryStrings
          )
        )
    }
  } catch (error) {
    next(error)
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

module.exports = {
  getAllLikes,
  getLikesByProductId,
  getLikesByUserId,
  getLikesByLoverId,
}
