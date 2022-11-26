"use strict"
require('dotenv').config()
const mailgun = require('mailgun-js')

const sendEmail = () => {
    const mg = mailgun({
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
    })

    const data = {
        from: 'BraianLuis@apishop.com',
        to: "apishop@yopmail.com",
        subject: 'Bienvenido',
        text: "http://localhost:9000/api/accounts/confirm/"
    }
    mg.messages().send(data, (error, body) => {
        if (error) {
            console.error('error', error)
        }
        console.log('correo enviado')
        console.log(body)
    })
}

sendEmail()