'use strict'
require('dotenv').config()

const { getConnection, connect } = require('./db')
const Chance = require('chance')
const chance = new Chance()
const v4 = require('uuid').v4
const bcrypt = require('bcrypt')
const fs = require('fs/promises')
const path = require('path')

const PROJECT_MAIN_FOLDER_PATH = process.cwd()
const PUBLIC_FOLDER_PATH = path.join(
  PROJECT_MAIN_FOLDER_PATH,
  'public',
  'uploads'
)
const PRODUCTS_FOLDER_PATH = path.join(PUBLIC_FOLDER_PATH, 'products')

async function initDBTest() {
  let connection = null

  try {
    await connect()
    connection = await getConnection()

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

    //metemos datos de prueba
    const FAKE_USERS = 3
    const password = 'mypassword'

    for (let i = 0; i < FAKE_USERS; i++) {
      const email = `habfakeuser-${i + 1}@yopmail.com`
      const code = `${v4()}`
      await connection.query(
        `INSERT INTO users (name, email, password, code, status) VALUES(?, ?, ?, ?, ?)`,
        [
          chance.name(),
          email,
          `${await bcrypt.hash(password, 8)}`,
          code,
          'active',
        ]
      )
    }

    const names = [
      'Hp',
      'Sony',
      'Acer',
      'Toshiba',
      'Samsung',
      'Apple',
      'Lenovo',
      'Asus',
      'Msi',
      'Dell',
      'Siemens',
      'Lg',
      'Philips',
      'Asus',
    ]

    const categories = [
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

    const locations = [
      'Coruña',
      'Ferrol',
      'Santiago',
      'Vigo',
      'Pontevedra',
      'Lugo',
      'Ourense',
      'Salamanca',
      'Madrid',
      'Sevilla',
      'Almeria',
      'Barcelona',
    ]
    const prices = [100, 500, 900, 1300, 1700, 2100, 2500, 2900, 3400]
    const FAKE_PRODUCTS = 200
    let users_location = []
    for (let index = 0; index < FAKE_PRODUCTS; index++) {
      const name = chance.pickone(names)
      const category = chance.pickone(categories)
      const price = chance.pickone(prices)
      let location = chance.pickone(locations)
      //obtenemos los id de los usuarios y los metemos en un array
      const user_id = chance.integer({ min: 1, max: FAKE_USERS })
      //guardamos el user_id y la localizacion en un objeto
      const pairs = { user_id, location }
      //guardamos el objeto en un array
      users_location.push(pairs)
      //si user_id existe en el array
      if (users_location.find((user) => user.user_id === user_id)) {
        //cogemos la localizacion del objeto que tiene el user_id
        location = users_location.find(
          (user) => user.user_id === user_id
        ).location
      }

      //metemos el logo de la marca en la imagen
      const file = `./img/logo.png`
      //Conseguimos el formato de la imagen
      const format = file.split('.').pop()
      //Creamos un nombre aleatorio para la imagen
      const imageFileName = `${v4()}.${format}`
      //Formamos la ruta de la imagen
      const PRODUCTS_USER_FOLDER_PATH = path.join(
        PRODUCTS_FOLDER_PATH,
        user_id.toString()
      )
      //Creamos la ruta de la imagen
      await fs.mkdir(PRODUCTS_USER_FOLDER_PATH, { recursive: true })
      //Copiamos la imagen y la renombramos con imageFileName en la ruta PRODUCTS_USER_FOLDER_PATH
      await fs.copyFile(
        file,
        path.join(PRODUCTS_USER_FOLDER_PATH, imageFileName)
      )

      await connection.query(
        `INSERT INTO products (name, category, location, price, image, caption, user_id) VALUES(?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          category,
          location,
          price,
          imageFileName,
          chance.sentence({ words: 10 }),
          user_id,
        ]
      )
      //actualizar el numero de productos de cada usuario
      const products = await connection.query(
        `SELECT COUNT(*) AS total FROM products WHERE status IS NULL AND user_id = ${user_id}`
      )
      await connection.query(
        `UPDATE users SET products = ${products[0][0].total} WHERE id = ${user_id}`
      )
    }

    console.log('Datos de prueba insertados! 🤠')

    console.log('Database initialized')
  } catch (e) {
    console.error('Error connecting to database: ', e)
    throw e
  } finally {
    if (connection) {
      connection.release()
      process.exit()
    }
  }
}
initDBTest()

module.exports = initDBTest
