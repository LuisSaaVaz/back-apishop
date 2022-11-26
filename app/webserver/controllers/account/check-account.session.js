'use strict'

const { getTokenData, generateError } = require('../../../../helpers')

async function checkAccountSession(req, res, next) {
    try {
        // verificamos que haya token en los headers de la peticion

        const authorization = req.headers.authorization

        // si no hay token, devolvemos un error 400
        if (!authorization) {
            throw generateError(' Unauthorized. Porfavor introduce el token en los headers para acceder a esta ruta', 401)
            /* return res.status(401).send({
                status: ' Unauthorized',
                message:
                    'Porfavor introduce el token en los headers para acceder a esta ruta',
            }) */
        }

        const [prefix, token] = authorization.split(' ')

        // si el prefix no es Bearer, devolvemos un error 400
        // Si authorization no contiene " "
        if (!authorization.includes(' ')) {
            throw generateError(' Unauthorized. Porfavor revise Authorization en el header, falta alguno de los elementos. Deberia tener este formato: Bearer token', 401)
        } else if (prefix !== 'Bearer') {
            throw generateError(' Unauthorized. Porfavor revise Authorization en el header, El prefijo no es correcto. Deberia tener este formato: Bearer token', 401)
        }

        // si hay token, lo extraemos y lo guardamos en la variable payload y los pasamos a las claims para poder acceder a los datos del token
        const payload = await getTokenData(token)

        req.claims = {
            userId: payload.data.userId,
            status: payload.data.status,
            email: payload.data.email,
        }

        return next()
        
    } catch (error) {
        next (error)
    }
}
module.exports = checkAccountSession
