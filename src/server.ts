import * as http from 'http'

const server = http.createServer((req, res) => {
    if (req.url === "/api/upload" && req.headers['content-type']?.includes('multipart/form-data')) {
        res.writeHead(200)
        return res.end(JSON.stringify(`route for uploading files`))
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