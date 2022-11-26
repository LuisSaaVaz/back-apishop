'use strict'

const { getConnection } = require('../../../db/db')
const joi = require('joi').extend(require('@joi/date'))
const { getTokenData } = require('../../../../helpers')
const mailgun = require('mailgun-js')

async function validateData(payload) {
  const schema = joi.object({
    emailBuyer: joi.string().email().required(),
    idProduct: joi.number().required(),
    deliveryAddress: joi.string().required(),
    deliveryTime: joi.date().format('YYYY-MM-DD HH:mm').raw().required(),
  })

  joi.assert(payload, schema)
}

async function sendEmail({
  emailFrom,
  emailTo,
  deliveryAddress,
  deliveryTime,
  productId,
}) {
  const mg = mailgun({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  })

  const data = {
    from: emailFrom,
    to: emailTo,
    subject: 'Aceptación de compra',
    html: `<h2>El vendedor ha aceptado su solicitud de compra</h2>
                <p>El producto con id ${productId} será entregado en ${deliveryAddress} a las ${deliveryTime}</p>
                    <h3>Una vez que haya recivido su producto prodrá valorar al vendedor en el siguiente enlace o accediendo directamente desde superfil !  </h3>
                    <p>Gracias por confiar en nosotros !</p>
                    <a href="http://localhost:3000/users/score/${productId}"> ---> Click aquí para valorar al vendedor <--- </a>`,
  }
  mg.messages().send(data, (error, body) => {
    if (error) {
      console.error('error', error)
    }
    return body
  })
}

async function postConfirmBuyProduct(req, res) {
  /*
   * 1. Validar los datos que nos llegan de los params y del body.👌
   * 2. Comprobar que la persona que esta logeada es la misma que a la que le pertenece el producto a vender. 👌
   * 3. Hacer la consulta a la DDBB e insertar una nueva reserva para ese producto. 👌
   * 4. Cambiar el status del producto. 👌
   * 5. Enviar el correo al comprador indicando hora y lugar de entrega
   */

  const dataBody = {
    ...req.body,
  }

  const authorization = req.query.email
  console.log('authorization desde confirm', authorization)

  if (!authorization) {
    return res.status(400).send({
      message: 'El email no se ha encontrado en la query',
    })
  }
  let payload = null

  try {
    payload = getTokenData(authorization)
    console.log('payload desde confirm', payload)
  } catch (error) {
    console.log('error', error)
    return res.status(401).send({
      status: 'Unauthorized',
      message: 'El token no es valido',
    })
  }

  const data = {
    emailBuyer: payload.data.email,
    idProduct: req.params.id,
    deliveryTime: dataBody.deliveryTime,
    deliveryAddress: dataBody.deliveryAddress,
  }
  const userId = req.claims.userId
  console.log('userId', userId)

  // validamos los datos de la url que se nos envió por el correo
  try {
    await validateData(data)
  } catch (e) {
    console.error(e)
    return res.status(400).send({
      status: 'Bad request',
      message:
        'Los datos introducidos no son correctos recuerde que el formato de la fecha es YYYY-MM-DD HH:mm',
    })
  }

  // Validamos que el usuario registrado sea el correcto comprobando la ID de las claims con la del propietario del producto.
  let connection = null
  let sellerEmail = null
  try {
    connection = await getConnection()
    const [rows] = await connection.query(
      `SELECT u.email, p.user_id FROM users u JOIN products p  ON u.id = p.user_id  WHERE p.id = ${data.idProduct} `
    )
    const userIdProduct = rows[0]

    sellerEmail = rows[0].email

    if (userIdProduct === undefined) {
      return res.status(404).send({
        message: 'El producto no existe',
      })
    }

    if (userIdProduct.user_id !== userId) {
      return res.status(403).send({
        status: 'Unauthorized',
        message:
          'No tiene permisos para acceder a esta ruta debe ser el propietario del producto',
      })
    }
  } catch (e) {
    console.error(e.message)
    return res.status(500).send()
  } finally {
    if (connection !== null) connection.release()
  }

  // validamos que el producto este disponible para comprar

  const now = new Date()

  const deliveryTime = new Date(data.deliveryTime)
  console.log('now', now)
  console.log('deliveryTime', deliveryTime)

  if (now.getTime() > deliveryTime.getTime()) {
    return res.status(400).send({
      status: 'Bad request',
      message: 'La fecha de entrega no puede ser anterior a la fecha actual',
    })
  }

  const dateToSql = deliveryTime.toISOString().slice(0, 19).replace('T', ' ')

  const booking = {
    product_id: data.idProduct,
    created_at: now,

    delivery_address: data.deliveryAddress,
    delivery_time: dateToSql,
  }

  // Validamos que el producto no tenga una reserva, insertamos la reserva en la DDBB y cambiamos el status del producto a "bought" e insertamos el correo de la persona que ha comprado el producto.
  try {
    connection = await getConnection()
    const [rows] = await connection.query(
      'SELECT * FROM bookings WHERE product_id = ?',
      data.idProduct
    )

    if (rows.length > 0) {
      return res.status(409).send({
        status: 'Conflict',
        message: `El producto ya ha sido vendido a ${data.emailBuyer} `,
      })
    }
    connection.release()

    await connection.query('INSERT INTO bookings SET ?', booking)
    const [users] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      data.emailBuyer
    )

    // Cambiamos el status del producto a "bought" , e insertamos el id del usuario que ha comprado el producto.
    const buyerId = users[0].id

    await connection.query(
      'UPDATE products SET status = "bought",  buyer_id = ?  WHERE id = ?',
      [buyerId, data.idProduct]
    )

    res.status(200).send({
      status: 'success',
      message: 'La venta se ha realizado correctamente',
    })

    const dataEmail = {
      emailFrom: sellerEmail,
      emailTo: data.emailBuyer,
      deliveryAddress: data.deliveryAddress,
      deliveryTime: data.deliveryTime,
      productId: data.idProduct,
    }

    await sendEmail(dataEmail)
  } catch (e) {
    console.error(e.message)
    res.status(500).send()
  } finally {
    connection.release()
  }
}

module.exports = postConfirmBuyProduct
