import * as http from 'http'
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'
import formidable from 'formidable'
import { Writable } from 'stream'
import * as amqplib from 'amqplib'
import { DataSource } from 'typeorm'

function getLocalStorageStream (filename: string): Writable {
    return fs.createWriteStream(path.resolve(`./files/${filename}`))
}

let sendFileNotification: (msg: string) => boolean
let db: DataSource

const server = http.createServer(async (req, res) => {
    if (req.url === "/api/upload" && req.headers['content-type']?.includes('multipart/form-data')) {
        const newFileName = uuidv4()
        const form = formidable({ 
            fileWriteStreamHandler: () => getLocalStorageStream(newFileName),
            filter: ({ mimetype }) => mimetype === 'application/pdf'
        })
        await form.parse(req)
        sendFileNotification('You have a new file')
        res.writeHead(200)
        return res.end(JSON.stringify(`file received`))
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
    const connection = await amqplib.connect('amqp://localhost')
    const ch1 = await connection.createChannel()
    const queueName = 'files'
    await ch1.assertQueue(queueName)

    sendFileNotification = (msg: string) => ch1.sendToQueue(queueName, Buffer.from(msg))

    const PostgresDataSource = new DataSource({
        type: "postgres",
        host: "localhost",
        port: 5432,
        username: "postgres",
        password: "mysecretpassword",
        database: "postgres",
        entities: [],
    })

    db = await PostgresDataSource.initialize()
})