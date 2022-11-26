const Joi = require('joi')
const jwt = require('jsonwebtoken')
const authJwtSecret = process.env.AUTH_JWT_SECRET
const jwtExpiresIn = +process.env.JWT_EXPIRES_IN

const generateError = (message, status) => {
  const error = new Error(message)
  error.httpStatus = status
  return error
}

const getToken = (payload) => {
  return jwt.sign(
    {
      data: payload,
    },
    authJwtSecret,
    { expiresIn: jwtExpiresIn }
  )
}

const getTokenData = (token) => {
  return jwt.verify(token, authJwtSecret)
}

async function validateUsers(payload) {
  const schema = Joi.object({
    id: Joi.number().integer().positive().min(1),
    name: Joi.string().max(60),
    email: Joi.string().email().max(255),
    password: Joi.string().max(60),
    code: Joi.string().max(255),
    status: Joi.string().max(60).valid('active', 'admin'),
    bio: Joi.string().min(0).max(255),
    page: Joi.number().integer().positive().min(1),
  })

  Joi.assert(payload, schema)
}

async function validateProducts(payload) {
  const schema = Joi.object({
    search: Joi.string().max(60),
    text: Joi.string().max(60),
    id: Joi.number().integer().positive().min(1),
    category: Joi.string()
      .max(60)
      .pattern(/^[a-zA-Z\u00C0-\u017F]+$/),
    name: Joi.string().max(60),
    location: Joi.string()
      .max(60)
      .pattern(/^[a-zA-Z\u00C0-\u017F]+$/),
    user_id: Joi.number().integer().positive().min(1),
    price: Joi.number().positive().min(0).max(3500),
    minPrice: Joi.number().integer().positive().min(1),
    maxPrice: Joi.number().integer().positive().max(3500),
    likes: Joi.number().integer().positive().min(0),
    minLikes: Joi.number().integer().positive().min(0),
    maxLikes: Joi.number().integer().positive().min(1),
    score: Joi.number().positive().min(0).max(5),
    minScore: Joi.number().positive().min(0),
    maxScore: Joi.number().positive().max(5),
    valoration: Joi.number().integer().positive().min(0).max(5),
    minValoration: Joi.number().integer().positive().min(0),
    maxValoration: Joi.number().integer().positive().max(5),
    buyer_id: Joi.number().integer().positive(),
    status: Joi.string().max(60).valid('bought'),
    caption: Joi.string().max(255),
    page: Joi.number().integer().positive().min(1),
  })

  Joi.assert(payload, schema)
}

async function validateLikes(payload) {
  const schema = Joi.object({
    id: Joi.number().integer().positive().min(1),
    product_id: Joi.number().integer().positive().min(1),
    user_id: Joi.number().integer().positive().min(1),
    lover_id: Joi.number().integer().positive().min(1),
    page: Joi.number().integer().positive().min(1),
  })

  Joi.assert(payload, schema)
}

async function createLikesFilter(data, query, conditions, queryStrings) {
  const { product_id, user_id, lover_id } = data
  if (product_id || user_id || lover_id) {
    if (product_id) {
      conditions.push(`product_id = '${product_id}'`)
      queryStrings.push(`product_id=${product_id}`)
    }
    if (user_id) {
      conditions.push(`user_id = '${user_id}'`)
      queryStrings.push(`user_id=${user_id}`)
    }
    if (lover_id) {
      conditions.push(`lover_id = '${lover_id}'`)
      queryStrings.push(`lover_id=${lover_id}`)
    }
    query = `${query} AND ${conditions.join(' AND ')}`
  }
  return { query, conditions, queryStrings }
}

async function createProductFilter(data, query, conditions, queryStrings) {
  const {
    category,
    name,
    location,
    caption,
    user_id,
    price,
    minPrice,
    maxPrice,
    likes,
    minLikes,
    maxLikes,
    score,
    minScore,
    maxScore,
    valoration,
    minValoration,
    maxValoration,
    buyer_id,
  } = data

  if (
    category ||
    name ||
    location ||
    caption ||
    user_id ||
    price ||
    minPrice ||
    maxPrice ||
    likes ||
    minLikes ||
    maxLikes ||
    score ||
    minScore ||
    maxScore ||
    valoration ||
    minValoration ||
    maxValoration ||
    buyer_id
  ) {
    if (category) {
      conditions.push(`category = '${category}'`)
      queryStrings.push(`category=${category}`)
    }
    if (name) {
      conditions.push(`p.name = '${name}'`)
      queryStrings.push(`name=${name}`)
    }
    if (location) {
      conditions.push(`location = '${location}'`)
      queryStrings.push(`location=${location}`)
    }
    if (caption) {
      conditions.push(`caption = '%${caption}%'`)
      queryStrings.push(`caption=${caption}`)
    }
    if (user_id) {
      conditions.push(`user_id = '${user_id}'`)
      queryStrings.push(`user_id=${user_id}`)
    }
    if (price) {
      conditions.push(`price = '${price}'`)
      queryStrings.push(`price=${price}`)
    }
    if (minPrice) {
      conditions.push(`price >= '${minPrice}'`)
      queryStrings.push(`minPrice=${minPrice}`)
    }
    if (maxPrice) {
      conditions.push(`price <= '${maxPrice}'`)
      queryStrings.push(`maxPrice=${maxPrice}`)
    }
    if (likes) {
      conditions.push(`likes = '${likes}'`)
      queryStrings.push(`likes=${likes}`)
    }
    if (minLikes) {
      conditions.push(`likes >= '${minLikes}'`)
      queryStrings.push(`minLikes=${minLikes}`)
    }
    if (maxLikes) {
      conditions.push(`likes <= '${maxLikes}'`)
      queryStrings.push(`maxLikes=${maxLikes}`)
    }
    if (score) {
      conditions.push(`score = '${score}'`)
      queryStrings.push(`score=${score}`)
    }
    if (minScore) {
      conditions.push(`score >= '${minScore}'`)
      queryStrings.push(`minScore=${minScore}`)
    }
    if (maxScore) {
      conditions.push(`score <= '${maxScore}'`)
      queryStrings.push(`maxScore=${maxScore}`)
    }
    if (valoration) {
      conditions.push(`valoration = '${valoration}'`)
      queryStrings.push(`valoration=${valoration}`)
    }
    if (minValoration) {
      conditions.push(`valoration >= '${minValoration}'`)
      queryStrings.push(`minValoration=${minValoration}`)
    }
    if (maxValoration) {
      conditions.push(`valoration <= '${maxValoration}'`)
      queryStrings.push(`maxValoration=${maxValoration}`)
    }
    if (buyer_id) {
      conditions.push(`buyer_id = '${buyer_id}'`)
      queryStrings.push(`buyer_id=${buyer_id}`)
    }
    query = `${query} AND ${conditions.join(' AND ')}`
  }

  return { query, conditions, queryStrings }
}

async function pagination(
  urlBase,
  page,
  totalPages,
  totalObject,
  offset,
  object,
  queryStrings
) {
  if (queryStrings.length > 0) {
    const prevPage =
      page > 1 ? `?page=${page - 1}&${queryStrings.join('&')}` : null
    const currentPage = `?page=${page}&${queryStrings.join('&')}`
    const nextPage =
      page < totalPages ? `?page=${page + 1}&${queryStrings.join('&')}` : null
    const firstPage = `?page=1&${queryStrings.join('&')}`
    const lastPage = `?page=${totalPages}&${queryStrings.join('&')}`
    const pageView = `Página: ${page} de ${totalPages}`
    const productsView = `Productos: ${offset + 1} al ${
      offset + object.length
    }, de ${totalObject}`
    //Objeto info con los datos de la pagina
    const info = {
      prevPage,
      currentPage,
      nextPage,
      firstPage,
      lastPage,
      totalObject,
      totalPages,
      pageView,
      productsView,
    }
    const result = { info, object }

    //Si todo va bien. Devolvemos los productos y la info de la paginación
    return result
  } else {
    const prevPage = page > 1 ? `?page=${page - 1}` : null
    const currentPage = `?page=${page}`
    const nextPage = page < totalPages ? `?page=${page + 1}` : null
    const firstPage = `?page=1`
    const lastPage = `?page=${totalPages}`
    const pageView = `Pagina: ${page} de ${totalPages}`
    const productsView = `Productos: ${offset + 1} al ${
      offset + object.length
    }, de ${totalObject}`
    //objeto info con los datos de la pagina
    const info = {
      prevPage,
      currentPage,
      nextPage,
      firstPage,
      lastPage,
      totalObject,
      totalPages,
      pageView,
      productsView,
    }
    const result = { info, object }

    //Si todo va bien. Devolvemos los products y la info de la paginación
    return result
  }
}

module.exports = {
  generateError,
  getToken,
  getTokenData,
  validateUsers,
  validateProducts,
  validateLikes,
  createLikesFilter,
  createProductFilter,
  pagination,
}
