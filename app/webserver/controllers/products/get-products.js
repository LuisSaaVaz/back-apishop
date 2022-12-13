'use strict'

//Necesitamos conectar con la DDBB
const { getConnection } = require('../../../db/db.js')

//Importar del archivo de la ruta ../helpers.js la Variable que uso para la Gestion de Errores
const {
  generateError,
  validateProducts,
  pagination,
  createProductFilter,
} = require('../../../../helpers')

const MAX_PRODUCTS_PER_PAGE = 10

/***************************************************************
 ****************************ALL********************************
 **************************************************************/

const getAllProducts = async (req, res, next) => {
  let connection = null

  //DATOS DE LA PETICION
  req.claims = { ...req.query }
  const data = { ...req.claims }

  //PARA LA PAGINACION
  const page = parseInt(req.query.page, 10) || 1 //Pagina recibida por querystring o por defecto 1
  const offset = (page - 1) * MAX_PRODUCTS_PER_PAGE //Registros que se saltaran

  //VALIDACIONES
  try {
    await validateProducts({ ...data })
    console.log('Datos validados')
  } catch (error) {
    return res.status(400).send({
      status: 'Bad Request',
      message: error.details[0].message,
    })
  }

  //OBTENER LOS ELEMENTOS DE LA BASE DE DATOS
  try {
    //Creamos la conexion a la base de datos
    connection = await getConnection()
    let conditions = []
    let queryStrings = []
    let query = `SELECT p.id, p.category, p.name, p.price, p.location, p.image, p.caption,p.status, p.likes, p.user_id, u.name AS user_name,  u.score AS user_score FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.status IS NULL`

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

    let totalProducts = null
    //Cojo el total de productos que hay en la base de datos
    if (conditions.length > 0) {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND ${conditions.join(
          ' AND '
        )}`
      )
      totalProducts = totalProducts[0].total
    } else {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL`
      )
      totalProducts = totalProducts[0].total
    }

    //Cojo el total de paginas que hay en la base de datos
    const totalPages = Math.ceil(totalProducts / MAX_PRODUCTS_PER_PAGE)

    //Cojo todos los products de la base de datos
    const [allProducts] = await connection.query(
      `${query}  ORDER BY p.id DESC LIMIT ${MAX_PRODUCTS_PER_PAGE} OFFSET ${offset}`
    )
    console.log(allProducts.length)
    //si no existe ningun product devuelve un error
    if (allProducts.length === 0) {
      throw generateError(`No existen productos`, 404)
    } else if (page > totalPages) {
      throw generateError(
        `Not Found. No existe la pagina ${page}, Van del 1 al ${totalPages}`,
        404
      )
    } else {
      const urlBase = `http://${req.headers.host}/api/products`
      return res
        .status(200)
        .send(
          await pagination(
            urlBase,
            page,
            totalPages,
            totalProducts,
            offset,
            allProducts,
            queryStrings
          )
        )
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
 ***********************BY SUGGESTION***************************
 **************************************************************/

const getProductBySuggestion = async (req, res, next) => {
  let connection = null

  //DATOS DE LA PETICION
  const data = `${req.params.search}`
  console.log(data)
  let search = null

  //PARA LA PAGINACION
  // const page = parseInt(req.query.page, 10) || 1 //Pagina recibida por querystring o por defecto 1
  // const offset = (page - 1) * MAX_PRODUCTS_PER_PAGE //Registros que se saltaran

  //VALIDACIONES
  try {
    if (data.includes('-')) {
      search = data.replace('-', ' ')
      await validateProducts({ search })
      console.log('datos validados')
    } else {
      await validateProducts({ search: data })
      console.log('datos validados')
    }
  } catch (error) {
    res.status(400).send({
      status: 'Bad Request',
      message: error.details[0].message,
    })
  }

  //OBTENER LOS ELEMENTOS DE LA BASE DE DATOS
  try {
    //Creamos la conexion a la base de datos
    connection = await getConnection()

    if (search) {
      //Numero de productos y productos buscando por nombre y por categoria
      const [nameTotalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products WHERE status IS NULL AND name LIKE '%${search}%'`
      )
      const [nameProducts] = await connection.query(
        `SELECT p.id, p.category, p.name, p.price, p.location, p.image, p.caption, p.status, p.likes, p.user_id, u.name AS user_name, u.score AS user_score, p.created_at FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.status IS NULL AND p.name LIKE '%${search}%' ORDER BY p.id DESC`
      )
      const [categoryTotalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products WHERE status IS NULL AND category LIKE '%${search}%'`
      )
      const [categoryProducts] = await connection.query(
        `SELECT p.id, p.category, p.name, p.price, p.location, p.image, p.caption,p.status. p.likes, p.user_id, u.name AS user_name, u.score AS user_score, p.created_at FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.status IS NULL AND p.category LIKE '%${search}%' ORDER BY p.id DESC`
      )

      if (
        nameTotalProducts[0].total === 0 &&
        categoryTotalProducts[0].total === 0
      ) {
        throw generateError(
          `Not Found. No existen productos con la busqueda ${search}`,
          404
        )
      } else {
        const results = {
          name: {
            total: nameTotalProducts[0].total,
            products: nameProducts[0],
          },
          category: {
            total: categoryTotalProducts[0].total,
            products: categoryProducts[0],
          },
        }
        return res.status(200).send(results)
      }
    } else {
      //Numero de productos buscando por nombre y por categoria
      const [nameTotalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products WHERE status IS NULL AND name LIKE '%${data}%'`
      )
      const [nameProducts] = await connection.query(
        `SELECT p.id, p.category, p.name, p.price, p.location, p.image, p.caption, p.likes, p.user_id, u.name AS user_name, u.score AS user_score, p.created_at FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.status IS NULL AND p.name LIKE '%${data}%' ORDER BY p.id DESC`
      )
      const [categoryTotalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products WHERE status IS NULL AND category LIKE '%${data}%'`
      )
      const [categoryProducts] = await connection.query(
        `SELECT p.id, p.category, p.name, p.status, p.price, p.location, p.image, p.caption, p.likes, p.user_id, u.name AS user_name, u.score AS user_score, p.created_at FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.status IS NULL AND p.category LIKE '%${data}%' ORDER BY p.id DESC`
      )

      if (
        nameTotalProducts[0].total === 0 &&
        categoryTotalProducts[0].total === 0
      ) {
        throw generateError(
          `Not Found. No existen productos con la busqueda ${data}`,
          404
        )
      } else {
        const results = {
          name: {
            total: nameTotalProducts[0].total,
            products: nameProducts[0],
          },
          category: {
            total: categoryTotalProducts[0].total,
            products: categoryProducts[0],
          },
        }
        return res.status(200).send(results)
      }
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
 *************************BY SEARCH*****************************
 **************************************************************/

/* const getProductBySearch = async (req, res, next) => {
    let connection = null

    //DATOS DE LA PETICION
    const data = `$req.params.search`
    console.log(data)
    let search = null

    //PARA LA PAGINACION
    // const page = parseInt(req.query.page, 10) || 1 //Pagina recibida por querystring o por defecto 1
    // const offset = (page - 1) * MAX_PRODUCTS_PER_PAGE //Registros que se saltaran

    //VALIDACIONES
    try {
        if (data.includes('-')) {
            search = data.replace('-', ' ')
            await validateProducts({ search })
            console.log('datos validados')
        } else {
            await validateProducts({ search: data })
            console.log('datos validados')
        }
    } catch (error) {
        res.status(400).send({
            status: 'Bad Request',
            message: error.details[0].message,
        })
    }

    //OBTENER LOS ELEMENTOS DE LA BASE DE DATOS
    try {
        //Creamos la conexion a la base de datos
        connection = await getConnection()

        if (search) {
            //Numero de productos y productos buscando por nombre y por categoria
            const [nameTotalProducts] = await connection.query(
                `SELECT COUNT(*) AS total FROM products WHERE status IS NULL AND name LIKE '%${search}%'`
            )
            const [nameProducts] = await connection.query(
                `SELECT p.id, p.category, p.name, p.price, p.location, p.image, p.caption, p.likes, p.user_id, u.name AS user_name, u.score AS user_score, p.created_at FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.status IS NULL AND p.name LIKE '%${search}%' ORDER BY p.created_at DESC`
            )
            const [categoryTotalProducts] = await connection.query(
                `SELECT COUNT(*) AS total FROM products WHERE status IS NULL AND category LIKE '%${search}%'`
            )
            const [categoryProducts] = await connection.query(
                `SELECT p.id, p.category, p.name, p.price, p.location, p.image, p.caption, p.likes, p.user_id, u.name AS user_name, u.score AS user_score, p.created_at FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.status IS NULL AND p.category LIKE '%${search}%' ORDER BY p.created_at DESC`
            )
        }
    } catch (error) {
        next(error) //Si llega aqui el error se envia al Middleware de gestion de errores
    } finally {
        if (connection) {
            connection.release() //Liberamos la conexion
        }
    }
} */

/***************************************************************
 ***************************BY ID*******************************
 **************************************************************/

const getProductById = async (req, res, next) => {
  let connection = null

  //DATOS DE LA PETICION
  const data = `${req.params.id}`
  console.log(data)
  let dataArray = null

  //PARA LA PAGINACION
  const page = parseInt(req.query.page, 10) || 1 //Pagina recibida por querystring o por defecto 1
  const offset = (page - 1) * MAX_PRODUCTS_PER_PAGE //Registros que se saltaran

  //VALIDACIONES
  try {
    if (data.includes('-')) {
      //lo separo por '-'
      dataArray = data.split('-')
      //validar que cada dato cumpla con validateProducts
      await Promise.all(
        dataArray.map(async (id) => {
          await validateProducts({ id })
        })
      )
      await validateProducts({ page })
      console.log('Datos validados')
    } else {
      const object = { id: data, page: req.query.page }
      await validateProducts(object)
      console.log('Datos validados')
    }
  } catch (error) {
    res.status(400).send({
      status: 'Bad Request',
      message: error.details[0].message,
    })
  }

  //OBTENER LOS ELEMENTOS DE LA BASE DE DATOS
  try {
    connection = await getConnection()
    //Coger el id mas grande de la base de datos

    let queryStrings = []

    if (dataArray) {
      let notExist = []
      const totalProducts = dataArray.length
      const totalPages = Math.ceil(totalProducts / MAX_PRODUCTS_PER_PAGE)
      //Map de dataArray para coger los ids y comprobar que existan en la base de datos, si no existen los añado a un array para devolver un error
      await Promise.all(
        dataArray.map(async (id) => {
          const [product] = await connection.query(
            `SELECT id FROM products WHERE  id = ${id}`
          )
          if (product.length === 0) {
            notExist.push(id)
          }
        })
      )

      if (notExist.length > 0) {
        notExist = notExist.join(', ')
        throw generateError(` No existe el producto o ya ha sido comprado`, 404)
      } else if (page > totalPages) {
        throw generateError(
          `Not Found. No existe la pagina ${page}, van del 1 al ${totalPages}`,
          404
        )
      } else {
        const dataString = dataArray.join(', ')
        //hacer la busqueda de los productos por id
        const [products] = await connection.query(
          `SELECT p.id, p.category, p.name, p.price, p.status ,p.location, p.image, p.caption, p.likes, p.user_id, u.name AS user_name, u.score AS user_score FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE  p.id IN (${dataString}) LIMIT ${MAX_PRODUCTS_PER_PAGE} OFFSET ${offset}`
        )

        const urlBase = `http://${req.headers.host}/api/products/filterBy/id/${data}`
        return res
          .status(200)
          .send(
            await pagination(
              urlBase,
              page,
              totalPages,
              totalProducts,
              offset,
              products,
              queryStrings
            )
          )
      }
    } else {
      const totalProducts = 1
      const totalPages = Math.ceil(totalProducts / MAX_PRODUCTS_PER_PAGE)
      const [product] = await connection.query(
        `SELECT p.id, p.category, p.name, p.price,p.status, p.location, p.image, p.caption, p.likes, p.user_id, u.name AS user_name, u.score AS user_score FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.id = '${data}' LIMIT ${MAX_PRODUCTS_PER_PAGE} OFFSET ${offset}`
      )
      if (product.length === 0) {
        throw generateError(` No existe el producto o ya ha sido comprado`, 404)
      } else if (page > totalPages) {
        throw generateError(
          `Not Found. No existe la pagina ${page}, van del 1 al ${totalPages}`,
          404
        )
      } else {
        const urlBase = `http://${req.headers.host}/api/products/filterBy/id/${data}`
        return res
          .status(200)
          .send(
            await pagination(
              urlBase,
              page,
              totalPages,
              totalProducts,
              offset,
              product,
              queryStrings
            )
          )
      }
    }
  } catch (error) {
    next(error)
  } finally {
    if (connection) {
      connection.release() //Liberamos la conexion
    }
  }
}

/***************************************************************
 *************************BY SEARCH*****************************
 **************************************************************/

const getProductBySearch = async (req, res, next) => {
  let connection = null

  //DATOS DE LA PETICION
  const search = `${req.params.search}`
  let searchQuery = null
  let searchQueryArray = null
  let searchName = null
  let searchCategory = null
  let searchLocation = null
  let searchCaption = null

  //si search contiene espacios separo por espacios y lo guardo en el searchQueryArray
  if (search.includes(' ')) {
    searchQueryArray = search.split(' ')
    //searchName es un string uniendo p.name Like '%${elemento del array}%' con ' OR '
    searchName = searchQueryArray.map((element) => {
      return `p.name LIKE '%${element}%'`
    })
    searchName = searchName.join(' OR ')
    searchCategory = searchQueryArray.map((element) => {
      return `category LIKE '%${element}%'`
    })
    searchCategory = searchCategory.join(' OR ')
    searchLocation = searchQueryArray.map((element) => {
      return `location LIKE '%${element}%'`
    })
    searchLocation = searchLocation.join(' OR ')
    searchCaption = searchQueryArray.map((element) => {
      return `caption LIKE '%${element}%'`
    })
    searchCaption = searchCaption.join(' OR ')
    searchQuery = `(${searchName}) OR (${searchCategory}) OR (${searchLocation}) OR (${searchCaption})`
  } else {
    searchQuery = `p.name LIKE '%${search}%' OR category LIKE '%${search}%' OR location LIKE '%${search}%' OR caption LIKE '%${search}%'`
  }

  req.claims = { ...req.query }
  const data = { ...req.claims }

  //PARA LA PAGINACION
  const page = parseInt(req.query.page, 10) || 1 //Pagina recibida por querystring o por defecto 1
  const offset = (page - 1) * MAX_PRODUCTS_PER_PAGE //Registros que se saltaran

  //VALIDACIONES
  try {
    await validateProducts({ ...data, search })
    console.log('Datos validados')
  } catch (error) {
    res.status(400).send({
      status: 'Bad Request',
      message: error.details[0].message,
    })
  }

  //OBTENER LOS ELEMENTOS DE LA BASE DE DATOS
  try {
    connection = await getConnection()
    let conditions = []
    let queryStrings = []
    let query = `SELECT p.id, p.category, p.status, p.name, p.price, p.location, p.image, p.caption, p.likes, p.user_id, u.name AS user_name, u.score AS user_score FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.status IS NULL`

    //Meter en query, conditions y queryStrings los elementos del objeto que devuelve la funcion createProductFilter
    const result = await createProductFilter(
      data,
      query,
      queryStrings,
      conditions
    )
    //query = result.query
    queryStrings = result.queryStrings
    conditions = result.conditions

    let totalProducts = null
    //Cojo el total de productos que hay en la base de datos
    if (conditions.length > 0) {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND ${conditions.join(
          ' AND '
        )} AND (${searchQuery})`
      )
      totalProducts = totalProducts[0].total
      query = ` ${query} AND ${conditions.join(' AND ')} AND (${searchQuery})`
    } else {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND (${searchQuery})`
      )
      totalProducts = totalProducts[0].total
      query = ` ${query} AND (${searchQuery})`
    }

    //Cojo el total de paginas que hay en la base de datos
    const totalPages = Math.ceil(totalProducts / MAX_PRODUCTS_PER_PAGE) //Redondeo para arriba

    //Cojo todos los products resultantes de la consulta
    const [products] = await connection.query(
      `${query}  ORDER BY p.id DESC LIMIT ${MAX_PRODUCTS_PER_PAGE} OFFSET ${offset}`
    )
    console.log(products.length)
    //si no existen productos o la pagina devuelve un error
    if (products.length === 0) {
      throw generateError(`No hay productos`, 404)
    } else if (page > totalPages) {
      throw generateError(
        `No exite la pagina ${page}, van del 1 al ${totalPages}`,
        404
      )
    } else {
      const urlBase = `http://${req.headers.host}/api/products/filterBy/search/${search}`
      return res
        .status(200)
        .send(
          await pagination(
            urlBase,
            page,
            totalPages,
            totalProducts,
            offset,
            products,
            queryStrings
          )
        )
    }
  } catch (error) {
    next(error)
  } finally {
    if (connection) {
      connection.release() //Liberamos la conexion
    }
  }
}
/***************************************************************
 *********************BY SEARCH OPTION**************************
 **************************************************************/

const getProductBySearchOption = async (req, res, next) => {
  let connection = null

  //DATOS DE LA PETICION
  const search = `${req.params.search}`
  const option = `${req.params.option}`
  let searchQuery = null
  let searchQueryArray = null
  let searchOption = null

  //si search contiene espacios separo por espacios y lo guardo en el searchQueryArray
  if (search.includes(' ')) {
    searchQueryArray = search.split(' ')
    //searchName es un string uniendo p.name Like '%${elemento del array}%' con ' OR '
    searchOption = searchQueryArray.map((element) => {
      return `p.${option} LIKE '%${element}%'`
    })
    const searchOptionString = searchOption.join(' OR ')
    searchQuery = `(${searchOptionString})`
  } else {
    searchQuery = `p.${option} LIKE '%${search}%'`
  }

  req.claims = { ...req.query }
  const data = { ...req.claims }

  //PARA LA PAGINACION
  const page = parseInt(req.query.page, 10) || 1 //Pagina recibida por querystring o por defecto 1
  const offset = (page - 1) * MAX_PRODUCTS_PER_PAGE //Registros que se saltaran

  //VALIDACIONES
  try {
    await validateProducts({ ...data, search })
    console.log('Datos validados')
  } catch (error) {
    res.status(400).send({
      status: 'Bad Request',
      message: error.details[0].message,
    })
  }

  //OBTENER LOS ELEMENTOS DE LA BASE DE DATOS
  try {
    connection = await getConnection()
    let conditions = []
    let queryStrings = []
    let query = `SELECT p.id, p.category, p.status, p.name, p.price, p.location, p.image, p.caption, p.likes, p.user_id, u.name AS user_name, u.score AS user_score FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.status IS NULL`

    //Meter en query, conditions y queryStrings los elementos del objeto que devuelve la funcion createProductFilter
    const result = await createProductFilter(
      data,
      query,
      queryStrings,
      conditions
    )
    //query = result.query
    queryStrings = result.queryStrings
    conditions = result.conditions

    let totalProducts = null
    //Cojo el total de productos que hay en la base de datos
    if (conditions.length > 0) {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND ${conditions.join(
          ' AND '
        )} AND (${searchQuery})`
      )
      totalProducts = totalProducts[0].total
      query = ` ${query} AND ${conditions.join(' AND ')} AND (${searchQuery})`
    } else {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND (${searchQuery})`
      )
      totalProducts = totalProducts[0].total
      query = ` ${query} AND (${searchQuery})`
    }

    //Cojo el total de paginas que hay en la base de datos
    const totalPages = Math.ceil(totalProducts / MAX_PRODUCTS_PER_PAGE) //Redondeo para arriba

    //Cojo todos los products resultantes de la consulta
    const [products] = await connection.query(
      `${query}  ORDER BY p.id DESC LIMIT ${MAX_PRODUCTS_PER_PAGE} OFFSET ${offset}`
    )
    console.log(products.length)
    //si no existen productos o la pagina devuelve un error
    if (products.length === 0) {
      throw generateError(`No hay productos`, 404)
    } else if (page > totalPages) {
      throw generateError(
        `No exite la pagina ${page}, van del 1 al ${totalPages}`,
        404
      )
    } else {
      const urlBase = `http://${req.headers.host}/api/products/filterBy/search/${search}`
      return res
        .status(200)
        .send(
          await pagination(
            urlBase,
            page,
            totalPages,
            totalProducts,
            offset,
            products,
            queryStrings
          )
        )
    }
  } catch (error) {
    next(error)
  } finally {
    if (connection) {
      connection.release() //Liberamos la conexion
    }
  }
}

/***************************************************************
 *********************BY TOTAL SEARCHS**************************
 **************************************************************/

const getTotalsBySearch = async (req, res, next) => {
  let connection = null
  const search = `${req.params.search}`
  console.log(search)
  let searchQuery = null
  let searchQueryArray = null
  let searchName = null
  let searchCategory = null
  let searchLocation = null
  let searchCaption = null

  //si search contiene espacios separo por espacios y lo guardo en el searchQueryArray
  if (search.includes(' ')) {
    searchQueryArray = search.split(' ')
    //searchName es un string uniendo p.name Like '%${elemento del array}%' con ' OR '
    searchName = searchQueryArray.map((element) => {
      return `p.name LIKE '%${element}%'`
    })
    searchName = searchName.join(' OR ')
    searchCategory = searchQueryArray.map((element) => {
      return `category LIKE '%${element}%'`
    })
    searchCategory = searchCategory.join(' OR ')
    searchLocation = searchQueryArray.map((element) => {
      return `location LIKE '%${element}%'`
    })
    searchLocation = searchLocation.join(' OR ')
    searchCaption = searchQueryArray.map((element) => {
      return `caption LIKE '%${element}%'`
    })
    searchCaption = searchCaption.join(' OR ')
    searchQuery = `${searchName} OR  ${searchCategory} OR ${searchLocation} OR ${searchCaption}`
  } else {
    searchQuery = `p.name LIKE '%${search}%' OR category LIKE '%${search}%' OR location LIKE '%${search}%' OR caption LIKE '%${search}%'`
  }

  try {
    connection = await getConnection()

    let [allTotal] = await connection.query(
      `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND (${searchQuery})`
    )
    allTotal = allTotal[0].total

    let [nameTotal] = await connection.query(
      `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND (${searchName})`
    )
    nameTotal = nameTotal[0].total

    let [categoryTotal] = await connection.query(
      `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND (${searchCategory})`
    )
    categoryTotal = categoryTotal[0].total

    let [locationTotal] = await connection.query(
      `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND (${searchLocation})`
    )
    locationTotal = locationTotal[0].total

    let [captionTotal] = await connection.query(
      `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND (${searchCaption})`
    )
    captionTotal = captionTotal[0].total

    res.status(200).send({
      status: 'OK',
      message: 'Totales de busqueda',
      data: { allTotal, nameTotal, categoryTotal, locationTotal, captionTotal },
    })
  } catch (error) {
    next(error)
  } finally {
    if (connection) {
      connection.release() //Liberamos la conexion
    }
  }
}

/***************************************************************
 *******************BY RANKING CATEGORIES***********************
 **************************************************************/

const getProductByRankingCategories = async (req, res, next) => {
  let connection = null

  //BUSCAR TODAS LAS CATEGORIAS DISTINTAS QUE HAY EN LA BASE DE DATOS
  //BUSCAR EL NUMERO DE PRODUCTOS QUE HAY EN CADA CATEGORIA
  try {
    connection = await getConnection()
    //lista de categorias ordenadas por numero de productos
    const [categories] = await connection.query(
      `SELECT DISTINCT category, COUNT(*) AS total FROM products WHERE status IS NULL GROUP BY category ORDER BY total DESC`
    )
    console.log(categories)
    if (categories.length === 0) {
      throw generateError(`Not Found. No existen categorias con productos`, 404)
    }
    return res.status(200).send(categories)
    //Hacer un map de las categorias para obtener un objeto con el nombre de la categoria y el numero de productos que hay en ella
  } catch (error) {
    next(error)
  } finally {
    if (connection) {
      connection.release() //Liberamos la conexion
    }
  }
}
/***************************************************************
 ************************BY LOCATION****************************
 **************************************************************/
const getLocationAndTotal = async (req, res, next) => {
  let connection = null

  //BUSCAR TODAS LAS LOCALIDADES DISTINTAS QUE HAY EN LA BASE DE DATOS
  try {
    connection = await getConnection()
    //lista de categorias ordenadas por numero de productos
    const [locations] = await connection.query(
      `SELECT DISTINCT location, COUNT(*) AS total FROM products WHERE status IS NULL GROUP BY location ORDER BY total DESC`
    )
    console.log(locations)
    if (locations.length === 0) {
      throw generateError(`Not Found. No existen categorias con productos`, 404)
    }
    return res.status(200).send(locations)
    //Hacer un map de las categorias para obtener un objeto con el nombre de la categoria y el numero de productos que hay en ella
  } catch (error) {
    next(error)
  } finally {
    if (connection) {
      connection.release() //Liberamos la conexion
    }
  }
}

const getProductByLocation = async (req, res, next) => {
  let connection = null
  const { location } = req.params
  req.claims = { ...req.query }
  const data = req.claims

  //PARA LA PAGINACION
  const page = parseInt(req.query.page, 10) || 1 //Pagina recibida por querystring o por defecto 1
  const offset = (page - 1) * MAX_PRODUCTS_PER_PAGE //Registros que se saltaran

  //VALIDACIONES
  try {
    await validateProducts({ ...data, location })
    console.log('datos validados')
  } catch (error) {
    return res.status(400).send({
      status: 'bad request',
      message: error.details[0].message,
    })
  }

  //OBTENER LOS ELEMENTOS DE LA BASE DE DATOS
  try {
    connection = await getConnection()
    let conditions = []
    let queryStrings = []
    let query = `SELECT p.id, p.category, p.name, p.price, p.location, p.image, p.caption, p.likes, p.user_id, u.name AS user_name, u.score AS user_score FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.status IS NULL AND  p.location LIKE '%${location}%'`

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

    let totalProducts = null
    //Cojo el total de productos que hay en la base de datos
    if (conditions.length > 0) {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND p.location LIKE '%${location}%' AND ${conditions.join(
          ' AND '
        )} ORDER BY p.id DESC`
      )
      totalProducts = totalProducts[0].total
    } else {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND p.location LIKE '%${location}%' ORDER BY p.id DESC`
      )
      totalProducts = totalProducts[0].total
    }

    //Cojo el total de paginas que hay en la base de datos
    const totalPages = Math.ceil(totalProducts / MAX_PRODUCTS_PER_PAGE) //Redondeo para arriba

    //Cojo todos los products resultantes de la consulta
    const [products] = await connection.query(
      `${query} LIMIT ${MAX_PRODUCTS_PER_PAGE} OFFSET ${offset}`
    )
    console.log(products.length)
    //si no existen productos o la pagina devuelve un error
    if (products.length === 0) {
      throw generateError(`No hay productos`, 404)
    } else if (page > totalPages) {
      throw generateError(
        `Not Found. No exite la pagina ${page}, van del 1 al ${totalPages}`,
        404
      )
    } else {
      const urlBase = `http://${req.headers.host}/api/products/filterBy/location/${location}`
      return res
        .status(200)
        .send(
          await pagination(
            urlBase,
            page,
            totalPages,
            totalProducts,
            offset,
            products,
            queryStrings
          )
        )
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
 ************************BY CATEGORY****************************
 **************************************************************/

const getProductByCategory = async (req, res, next) => {
  let connection = null

  //DATOS DE LA PETICION
  const category = req.params.category
  req.claims = { ...req.query } //req.claims es un objeto con los datos de la consulta de la url
  const data = { ...req.claims }

  //PARA LA PAGINACION
  const page = parseInt(req.query.page, 10) || 1 //Pagina recibida por querystring o por defecto 1
  const offset = (page - 1) * MAX_PRODUCTS_PER_PAGE //Registros que se saltaran

  //VALIDACIONES
  try {
    await validateProducts({ ...data, category })
    console.log('datos validados')
  } catch (error) {
    return res.status(400).send({
      status: 'bad request',
      message: error.details[0].message,
    })
  }

  //OBTENER LOS ELEMENTOS DE LA BASE DE DATOS
  try {
    connection = await getConnection()
    let conditions = []
    let queryStrings = []
    let query = `SELECT p.id, p.category, p.name, p.price, p.location, p.image, p.caption, p.likes, p.user_id, u.name AS user_name, u.score AS user_score FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.status IS NULL AND  p.category LIKE '%${category}%'`

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

    let totalProducts = null
    //Cojo el total de productos que hay en la base de datos
    if (conditions.length > 0) {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND p.category LIKE '%${category}%' AND ${conditions.join(
          ' AND '
        )} ORDER BY p.id DESC`
      )
      totalProducts = totalProducts[0].total
    } else {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND p.category LIKE '%${category}%' ORDER BY p.id DESC`
      )
      totalProducts = totalProducts[0].total
    }

    //Cojo el total de paginas que hay en la base de datos
    const totalPages = Math.ceil(totalProducts / MAX_PRODUCTS_PER_PAGE) //Redondeo para arriba

    //Cojo todos los products resultantes de la consulta
    const [products] = await connection.query(
      `${query} LIMIT ${MAX_PRODUCTS_PER_PAGE} OFFSET ${offset}`
    )
    console.log(products.length)
    //si no existen productos o la pagina devuelve un error
    if (products.length === 0) {
      throw generateError(`No hay productos`, 404)
    } else if (page > totalPages) {
      throw generateError(
        `Not Found. No exite la pagina ${page}, van del 1 al ${totalPages}`,
        404
      )
    } else {
      const urlBase = `http://${req.headers.host}/api/products/filterBy/category/${category}`
      return res
        .status(200)
        .send(
          await pagination(
            urlBase,
            page,
            totalPages,
            totalProducts,
            offset,
            products,
            queryStrings
          )
        )
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
 *************************BY USER_ID****************************
 **************************************************************/

const getProductByUserId = async (req, res, next) => {
  let connection = null

  //DATOS DE LA PETICION
  const user_id = req.params.userId
  req.claims = { ...req.query } //req.claims es un objeto con los datos de la consulta de la url
  const data = { ...req.claims }

  //PARA LA PAGINACION
  const page = parseInt(req.query.page, 10) || 1 //Pagina recibida por querystring o por defecto 1
  const offset = (page - 1) * MAX_PRODUCTS_PER_PAGE //Registros que se saltaran

  //VALIDACIONES
  try {
    await validateProducts({ ...data, user_id })
    console.log('Datos validos')
  } catch (error) {
    return res.status(400).send({
      status: 'bad request',
      message: error.details[0].message,
    })
  }

  //OBTENER LOS ELEMENTOS DE LA BASE DE DATOS
  try {
    connection = await getConnection()
    let conditions = []
    let queryStrings = []
    let query = `SELECT p.id, p.category, p.name, p.price, p.location, p.image, p.caption, p.likes, p.user_id, u.name AS user_name, u.score AS user_score FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.status IS NULL AND user_id = ${user_id}`

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

    let totalProducts = null
    //Cojo el total de productos que hay en la base de datos
    if (conditions.length > 0) {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND p.user_id = ${user_id} AND ${conditions.join(
          ' AND '
        )}`
      )
      totalProducts = totalProducts[0].total
    } else {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status IS NULL AND p.user_id = ${user_id}`
      )
      totalProducts = totalProducts[0].total
    }

    //Cojo el total de paginas que hay en la base de datos
    let totalPages = Math.ceil(totalProducts / MAX_PRODUCTS_PER_PAGE) //Redondeo hacia arriba para obtener el total de paginas

    //Cojo todos los products resultantes de la consulta
    const [products] = await connection.query(
      `${query} LIMIT ${MAX_PRODUCTS_PER_PAGE} OFFSET ${offset}`
    )
    console.log(products.length)

    //si no existe el product devuelve un error
    if (products.length === 0) {
      throw generateError(`No hay productos`, 404)
    } else if (page > totalPages) {
      throw generateError(
        `Not Found. No exite la pagina ${page}, van del 1 al ${totalPages}`,
        404
      )
    } else {
      const urlBase = `http://${req.headers.host}/api/products/filterBy/userId/${user_id}`
      return res
        .status(200)
        .send(
          await pagination(
            urlBase,
            page,
            totalPages,
            totalProducts,
            offset,
            products,
            queryStrings
          )
        )
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
 *************************BY BOUGHT*****************************
 **************************************************************/

const getBoughtProduct = async (req, res, next) => {
  let connection = null

  //DATOS DE LA PETICION
  req.claims = { ...req.query } //req.claims es un objeto con los datos de la consulta de la url
  const data = { ...req.claims }

  //PARA LA PAGINACION
  const page = parseInt(req.query.page, 10) || 1 //Pagina recibida por querystring o por defecto 1
  const offset = (page - 1) * MAX_PRODUCTS_PER_PAGE //Registros que se saltaran

  //VALIDACIONES
  try {
    await validateProducts(data)
    console.log('Datos validados')
  } catch (error) {
    return res.status(400).send({
      status: 'bad request',
      message: error.details[0].message,
    })
  }

  //OBTENER LOS ELEMENTOS DE LA BASE DE DATOS
  try {
    connection = await getConnection()
    let conditions = []
    let queryStrings = []
    let query = `SELECT p.id, p.category, p.status, p.name, p.price, p.location, p.likes, p.user_id, p.image, p.caption, u.name AS user_name, u.score AS user_score, p.valoration, p.buyer_id FROM products p LEFT JOIN users u ON p.user_id= u.id WHERE p.status = 'bought'`

    //Meter en query, conditions y queryStrings los elementos del objeto que devuelve la funcion createProductFilter
    const result = await createProductFilter(
      data,
      query,
      conditions,
      queryStrings
    )
    query = result.query
    conditions = result.conditions
    queryStrings = result.queryStrings

    let totalProducts = null
    //Cojo el total de productos que hay en la base de datos
    if (conditions.length > 0) {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status = 'bought' AND ${conditions.join(
          ' AND '
        )}`
      )
      totalProducts = totalProducts[0].total
    } else {
      ;[totalProducts] = await connection.query(
        `SELECT COUNT(*) AS total FROM products p WHERE p.status = 'bought'`
      )
      totalProducts = totalProducts[0].total
    }

    //Cojo el total de paginas que hay en la base de datos
    let totalPages = Math.ceil(totalProducts / MAX_PRODUCTS_PER_PAGE) //Redondeo hacia arriba para obtener el total de paginas

    const [products] = await connection.query(
      `${query} LIMIT ${MAX_PRODUCTS_PER_PAGE} OFFSET ${offset}`
    )
    console.log(products.length)
    if (products.length === 0) {
      throw generateError(`No hay productos`, 404)
    } else if (page > totalPages) {
      throw generateError(
        `Not Found. No exite la pagina ${page}, van del 1 al ${totalPages}`,
        404
      )
    } else {
      const urlBase = `http://${req.headers.host}/api/products/filterBy/bought`
      return res
        .status(200)
        .send(
          await pagination(
            urlBase,
            page,
            totalPages,
            totalProducts,
            offset,
            products,
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
  getAllProducts,
  getProductBySuggestion,
  getProductById,
  getProductBySearch,
  getProductBySearchOption,
  getTotalsBySearch,
  getProductByCategory,
  getProductByLocation,
  getProductByRankingCategories,
  getProductByUserId,
  getBoughtProduct,
  getLocationAndTotal,
}
