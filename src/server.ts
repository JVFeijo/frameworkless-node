import * as http from 'http'
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'
import formidable from 'formidable'
import { Writable } from 'stream'
import * as amqplib from 'amqplib'
import { DataSource } from 'typeorm'
import * as nodemailer from 'nodemailer'
import { EventEmitter } from 'events'

function getLocalStorageStream (filename: string): Writable {
    return fs.createWriteStream(path.resolve(`./files/${filename}`))
}

let sendFileNotification: (msg: string) => boolean
let db: DataSource
let eventBroker: EventEmitter

const server = http.createServer(async (req, res) => {
    if (req.url === "/api/upload" && req.headers['content-type']?.includes('multipart/form-data')) {
        const newFileName = uuidv4()
        const form = formidable({ 
            fileWriteStreamHandler: () => getLocalStorageStream(newFileName),
            filter: ({ mimetype }) => mimetype === 'application/pdf'
        })
        await form.parse(req)
        res.writeHead(200)
        res.end(JSON.stringify(`file received`))
        return eventBroker.emit('fileUploaded', 'You have a new file')
    }
    if (req.url === '/api' && req.method === 'GET') {
        const matches = req.url.match(/\/api\/users\/([0-9]+)/)
        if (matches !== null) {
            const userId = matches[1]
            
        }
        res.writeHead(200)
        return res.end(JSON.stringify(`route: ${req.url}, method: GET`))
    }
    if (req.url === '/api' && req.method === 'POST') {
        res.writeHead(200)
        return res.end(JSON.stringify(`route: ${req.url}, method: POST`))
    }
    if (req.url === '/api' && req.method === 'PUT') {
        res.writeHead(200)
        return res.end(JSON.stringify(`route: ${req.url}, method: PUT`))
    }
    if (req.url === '/api' && req.method === 'DELETE') {
        res.writeHead(200)
        return res.end(JSON.stringify(`route: ${req.url}, method: DELETE`))
    }
    res.writeHead(200)
    return res.end(JSON.stringify('default'))
})

server.listen(3000, async () => {
    const PostgresDataSource = new DataSource({
        type: "postgres",
        host: "postgres",
        port: 5432,
        username: "postgres",
        password: "mysecretpassword",
        database: "postgres",
        entities: [],
    })

    db = await PostgresDataSource.initialize()

    const connection = await amqplib.connect('amqp://guest:guest@rabbitmq:5672')
    const ch1 = await connection.createChannel()
    const queueName = 'files'
    await ch1.assertQueue(queueName)

    sendFileNotification = (msg: string) => ch1.sendToQueue(queueName, Buffer.from(msg))

    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'gerard.nolan37@ethereal.email',
            pass: 'dZW55B7WN9qJUg2QpK'
        }
    });

    function sendFileNotificationEmail(msg: string) {
        return transporter.sendMail({
            from: 'fromfakemail@mail.com',
            to: "tofakemail@mail.com",
            subject: msg,
            text: 'A new file was uploaded. Go check it out.'
        })
    }

    eventBroker = new EventEmitter()

    eventBroker.on('fileUploaded', sendFileNotification)
    eventBroker.on('fileUploaded', sendFileNotificationEmail)
})