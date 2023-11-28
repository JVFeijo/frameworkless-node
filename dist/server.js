"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const server = http.createServer((req, res) => {
    var _a;
    console.log(req.headers);
    if (req.url === "/api/upload" && ((_a = req.headers['content-type']) === null || _a === void 0 ? void 0 : _a.includes('multipart/form-data'))) {
        res.writeHead(200);
        return res.end(JSON.stringify(`route for uploading files`));
    }
    if (req.url === '/api' && req.method === 'GET') {
        res.writeHead(200);
        return res.end(JSON.stringify(`route: ${req.url}, method: GET`));
    }
    if (req.url === '/api' && req.method === 'POST') {
        res.writeHead(200);
        return res.end(JSON.stringify(`route: ${req.url}, method: POST`));
    }
    if (req.url === '/api' && req.method === 'PUT') {
        res.writeHead(200);
        return res.end(JSON.stringify(`route: ${req.url}, method: PUT`));
    }
    if (req.url === '/api' && req.method === 'DELETE') {
        res.writeHead(200);
        return res.end(JSON.stringify(`route: ${req.url}, method: DELETE`));
    }
    res.writeHead(200);
    return res.end(JSON.stringify('default'));
});
server.listen(3000);
