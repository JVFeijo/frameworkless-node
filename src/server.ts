import * as http from 'http'
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'
import formidable from 'formidable'
import { Readable, Writable } from 'stream'
import * as amqplib from 'amqplib'
import { DataSource } from 'typeorm'
import * as nodemailer from 'nodemailer'
import { EventEmitter } from 'events'
import axios from 'axios'
import * as dotenv from 'dotenv'
dotenv.config({ path: process.env.NODE_ENV !== 'dev' ? '.env.local' : '.env.dev' })


function getLocalStorageReadStream(filename: string): Readable {
    const filePath = path.resolve(`./files/${filename}`)
    return fs.createReadStream(filePath)
}

function getLocalStorageWriteStream(filename: string): Writable {
    const filePath = path.resolve(`./files/${filename}`)
    return fs.createWriteStream(filePath)
}

function fileExists(filename: string): boolean {
    const filePath = path.resolve(`./files/${filename}`)
    return fs.existsSync(filePath)
}

let sendFileNotification: (msg: string) => boolean
let db: DataSource
let eventBroker: EventEmitter

type UserData = {
    id: number,
    email: string,
    first_name: string,
    last_name: string,
    avatar: string
}

function getBasicUserData(user: UserData): Omit<UserData, 'avatar' | 'id'> {
    const { email, first_name, last_name } = user
    return { email, first_name, last_name }
}

const server = http.createServer(async (req, res) => {
    if (req.url === "/api/upload" && req.headers['content-type']?.includes('multipart/form-data')) {
        const newFileName = uuidv4()
        const form = formidable({ 
            fileWriteStreamHandler: () => getLocalStorageWriteStream(newFileName),
            filter: ({ mimetype }) => mimetype === 'application/pdf'
        })
        await form.parse(req)
        res.writeHead(200)
        res.end(JSON.stringify(`file received`))
        return eventBroker.emit('fileUploaded', 'You have a new file')
    }
    if (req.url && req.method === 'GET') {
        const matches = req.url.match(/\/api\/user\/([0-9]+)/)
        if (matches !== null) {
            const userId = matches[1]
            const requestUrl = `${process.env.USERS_API_URL}/${userId}`
            const { data: { data: userData }} = await axios.get<{ data: UserData }>(requestUrl)
            res.writeHead(200)
            return res.end(JSON.stringify(getBasicUserData(userData)))
        }
        const avatarMatches = req.url.match(/\/api\/user\/avatar\/([0-9]+)/)
        if (avatarMatches !== null) {
            const userId = avatarMatches[1]
            const avatarImageName = `${userId}-image.jpg`
            if (fileExists(avatarImageName)) {
                const avatarImageStream = getLocalStorageReadStream(avatarImageName)
                return avatarImageStream.pipe(res)
            } else {
                const requestUrl = `${process.env.USERS_API_URL}/${userId}`
                const { data: { data: userData }} = await axios.get<{ data: UserData }>(requestUrl)
                const avatarUrl = userData.avatar
                const response = await axios.get<Buffer>(avatarUrl, { responseType: 'arraybuffer' })
                const imageBuffer = response.data
                const imageStream = Readable.from(imageBuffer)
                imageStream.pipe(res)
                const localImageStream = getLocalStorageWriteStream(avatarImageName)
                const imageStream2 = Readable.from(imageBuffer)
                return imageStream2.pipe(localImageStream)
            }
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
        host: `${process.env.POSTGRES_URL}`,
        port: 5432,
        username: "postgres",
        password: "mysecretpassword",
        database: "postgres",
        entities: [],
    })

    db = await PostgresDataSource.initialize()

    const connection = await amqplib.connect(`amqp://${process.env.RABBIT_URL}`)
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