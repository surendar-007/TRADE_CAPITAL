"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const api_1 = require("./routes/api");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// API Routes
app.use('/api', api_1.router);
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'CSI Origin 2026 Supply-Chain Working Capital Engine',
        timestamp: new Date().toISOString()
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Supply-Chain Working Capital Market Engine running on http://localhost:${PORT}`);
});
