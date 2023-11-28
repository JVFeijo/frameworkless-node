import * as http from 'http'

const server = http.createServer((req, res) => {
    res.writeHead(200)
    res.end(JSON.stringify('Hello, world'))
})

server.listen(3000)