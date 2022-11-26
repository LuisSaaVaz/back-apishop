const { getConnection } = require('../../../db/db')

async function getUser(req, res) {
    const userId = req.claims.userId

    let connection = null

    try {
        if (!userId)
            return res.status(401).send({
                status: 'Unauthorized',
                message: 'No tiene permisos para solicitar los datos',
            })

        connection = await getConnection()
        const [row] = await connection.query(
            `SELECT id, name, score, status, avatar, bio, likes, loves, products, votes, created_at FROM users WHERE id = ${userId} `
        )

        if (!row) {
            return res.status(400).send({
                status: 'Bad request',
                message: 'Este usuario no existe',
            })
        }

        const data = {
            status: 'ok',
            data: row[0],
        }

        res.status(200).send(data)
    } catch (e) {
        res.status(500).send(e.message)
    } finally {
        if (connection !== null) {
            connection.release()
        }
    }
}

const getOwnerUser = async (req, res, next) => {
    let connection = null

    //DATOS DE LA PETICION
    const id = req.params.id

    //OBTENER LOS ELEMENTOS DE LA BASE DE DATOS
    try {
        connection = await getConnection()
        const [user] = await connection.query(
            `SELECT id, name, score, status, avatar, bio, likes, loves, products, votes, created_at FROM users WHERE id = ${id}`
        )

        if (!user.length) {
            throw (
                (new Error(`Not found. El usuario con id ${id} no existe`), 404)
            )
        }

        const ownerUser = user[0]

        return res.status(200).send(ownerUser)
    } catch (error) {
        next(error)
    } finally {
        if (connection !== null) connection.release()
    }
}

module.exports = { getUser, getOwnerUser }
