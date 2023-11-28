import * as http from 'http'

const server = http.createServer((req, res) => {
    if (req.url === '/api' && req.method === 'POST') {
        res.writeHead(200)
        return res.end(JSON.stringify(`route: ${req.url}, method: POST`))
    }
    res.writeHead(200)
    return res.end(JSON.stringify('default'))
})

server.listen(3000)