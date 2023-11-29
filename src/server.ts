import * as http from 'http'
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'
import formidable from 'formidable'
import { Writable } from 'stream'

function getLocalStorageStream (filename: string): Writable {
    return fs.createWriteStream(path.resolve(`./files/${filename}`))
}

const server = http.createServer(async (req, res) => {
    if (req.url === "/api/upload" && req.headers['content-type']?.includes('multipart/form-data')) {
        const newFileName = uuidv4()
        const form = formidable({ 
            fileWriteStreamHandler: () => getLocalStorageStream(newFileName),
            filter: ({ mimetype }) => {
            return mimetype === 'application/pdf'
        } })
        await form.parse(req)
        res.writeHead(200)
        return res.end(JSON.stringify(`file received`))
    }
    if (req.url === '/api' && req.method === 'GET') {
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

server.listen(3000)