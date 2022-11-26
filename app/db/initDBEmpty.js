// 'use strict'

const { getConnection } = require('./db')

//Para gestionar directorios y archivos
const path = require('path')

//Para Borrar directorios y archivos
const fs = require('fs/promises')
const { generateError } = require('../../helpers')

const PROJECT_MAIN_FOLDER_PATH = process.cwd()
const PUBLIC_FOLDER_PATH = path.join(PROJECT_MAIN_FOLDER_PATH, 'public')

async function initDB(req, res, next) {
  let connection = null

  try {
    connection = await getConnection()

    if (!connection) {
      throw generateError('No hay conexión a la base de datos', 500)
    }

    console.log('Borrando el directorio de fotos 🖼️')
    //borrar la ruta ./public que contiene las imagenes de los productos y los usuarios
    if (fs.access(PUBLIC_FOLDER_PATH)) {
      fs.rm(PUBLIC_FOLDER_PATH, { recursive: true })
    }

    console.log('Borrando tablas 😈')
    //borramos tablas si existen previamente
    await connection.query(`DROP TABLE IF EXISTS likes`)
    await connection.query(`DROP TABLE IF EXISTS bookings`)
    await connection.query(`DROP TABLE IF EXISTS products`)
    await connection.query(`DROP TABLE IF EXISTS users`)

    //creamos tablas
    await connection.query(`
            CREATE TABLE users (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                name VARCHAR(60) NOT NULL,
                email VARCHAR(255) NOT NULL,
                password CHAR(60) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                code VARCHAR(255) NULL,
                score decimal(3,2) NULL DEFAULT 0,
                status VARCHAR(60) NULL,
                avatar VARCHAR(255) NULL,
                bio VARCHAR(255) NULL,
                loves INT NULL DEFAULT 0,
                likes INT NULL DEFAULT 0,
                products INT NULL DEFAULT 0,
                votes INT NULL DEFAULT 0,
                PRIMARY KEY (id),
                UNIQUE INDEX email_UNIQUE (email)
            );
        `)

    await connection.query(`
            CREATE TABLE products (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                name VARCHAR(60) NOT NULL,
                category VARCHAR(60) NOT NULL,
                location VARCHAR(60) NOT NULL,
                price INT NOT NULL,
                likes INT NOT NULL DEFAULT 0,
                valoration INT NULL,
                buyer_id INT NULL,
                image VARCHAR(255) NOT NULL,
                caption VARCHAR(255)  NULL,
                status VARCHAR(60) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                user_id INT UNSIGNED NOT NULL,
                PRIMARY KEY (id),
                UNIQUE INDEX image_UNIQUE (image),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            );
        `)

    await connection.query(`
            CREATE TABLE bookings (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                product_id INT UNSIGNED NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                delivery_address VARCHAR(255)  NULL,
                delivery_time DATETIME NULL ,
                PRIMARY KEY (id),
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
            );
        `)

    await connection.query(`
            CREATE TABLE likes (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                product_id INT UNSIGNED NOT NULL,
                user_id INT UNSIGNED NOT NULL,
                lover_id INT UNSIGNED NOT NULL,
                created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id, user_id, product_id),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
            );
        `)

    console.log('Nuevas tablas creadas! 👌')
    console.log('Database initialized')
  } catch (error) {
    next(error)
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

module.exports = initDB
