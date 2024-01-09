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
import archiver from 'archiver'

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

function getNextTaskId(): number {
    return Math.random() * 10
}

interface ZipActivityTasksEvent {
    courseId: string
    activityId: string
}

function zipActivityTasks ({ courseId, activityId }: ZipActivityTasksEvent) {
    const filesDir = path.resolve(`./files/activities`)
    return fs.readdir(filesDir, (err, files) => {
        const regex = new RegExp(`${courseId}-${activityId}-task.*`)
        const taskFileNames = files.filter(fileName => regex.test(fileName))
        if (taskFileNames.length == 0) return;
        const zipFileStream = getLocalStorageWriteStream(`${courseId}-${activityId}-tasks.zip`)
        const archive = archiver('zip', { zlib: { level: 9 }})
        archive.pipe(zipFileStream)
        taskFileNames.forEach(fileName => archive.file(path.resolve(filesDir, fileName), { name: fileName }))
        return archive.finalize()
    })
}

const server = http.createServer(async (req, res) => {
    
    if (req.url && req.headers['content-type']?.includes('multipart/form-data')) {
        const adminUploadRouteMatch = req.url.match(/\/api\/upload\/admin\/course\/([0-9]+)\/activity\/([0-9]+)/)
        if (adminUploadRouteMatch !== null) {
            const courseId = adminUploadRouteMatch[1]
            const activityId = adminUploadRouteMatch[2]
            const taskId = getNextTaskId()
            const fileName = `/activities/${courseId}-${activityId}-task-${taskId}`
            const form = formidable({ 
                fileWriteStreamHandler: () => getLocalStorageWriteStream(fileName),
                filter: ({ mimetype }) => mimetype === 'application/pdf'
            })
            await form.parse(req)
            res.writeHead(200)
            res.end(JSON.stringify(`task file received`))
            return eventBroker.emit('taskUploaded', { courseId, activityId })
        }
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

        const downloadFilesMatches = req.url.match(/\/api\/course\/([0-9]+)\/activity\/([0-9]+)\/files/)
        if (downloadFilesMatches !== null) {
            const courseId = downloadFilesMatches[1]
            const activityId = downloadFilesMatches[2]
            const zippedFiles = getLocalStorageReadStream(`${courseId}-${activityId}-tasks.zip`)
            return zippedFiles.pipe(res)
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

    sendFileNotification = () => ch1.sendToQueue(queueName, Buffer.from('A new task is available'))

    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'gerard.nolan37@ethereal.email',
            pass: 'dZW55B7WN9qJUg2QpK'
        }
    });

    function sendFileNotificationEmail() {
        return transporter.sendMail({
            from: 'fromfakemail@mail.com',
            to: "tofakemail@mail.com",
            subject: 'A new task is available',
            text: 'A new file was uploaded. Go check it out.'
        })
    }

    eventBroker = new EventEmitter()

    eventBroker.on('taskUploaded', sendFileNotification)
    eventBroker.on('taskUploaded', sendFileNotificationEmail)
    eventBroker.on('taskUploaded', zipActivityTasks)
})