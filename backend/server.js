const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { HfInference } = require('@huggingface/inference');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// 1. Database Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codecritic';
mongoose.connect(MONGO_URI)
    .then(() => console.log("Database connected successfully"))
    .catch(err => console.log("Database connection error:", err));

// 2. User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    history: [{
        codeSnippet: String,
        review: String,
        score: Number,
        createdAt: { type: Date, default: Date.now }
    }]
});
const User = mongoose.model('User', userSchema);

const hf = new HfInference(process.env.HF_TOKEN);

// 3. Auth Endpoints
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "Registration successful" });
    } catch (err) {
        res.status(400).json({ error: "User already exists" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign({ userId: user._id }, 'SUPER_SECRET_KEY', { expiresIn: '7d' });
        res.json({ token, email: user.email });
    } catch (err) {
        res.status(500).json({ error: "Authentication failed" });
    }
});

// 4. Core Logic
app.post('/api/review', async (req, res) => {
    const { code, token } = req.body;
    try {
        const response = await hf.chatCompletion({
            model: "Qwen/Qwen2.5-7B-Instruct",
            messages: [
                {
                    role: "system",
                    content: "Review code for performance and security. Format: Suggestions first, then FULL CORRECTED CODE between ### FIXED_CODE_BLOCK and ### END_BLOCK."
                },
                { role: "user", content: code }
            ],
            max_tokens: 1200,
        });

        const fullText = response.choices[0].message.content;
        const fixedCodeMatch = fullText.match(/### FIXED_CODE_BLOCK([\s\S]*?)### END_BLOCK/);
        const fixedCode = fixedCodeMatch ? fixedCodeMatch[1].replace(/```javascript|```/g, "").trim() : "";
        const review = fullText.replace(/### FIXED_CODE_BLOCK[\s\S]*?### END_BLOCK/, "").trim();
        const score = Math.floor(Math.random() * (98 - 70 + 1)) + 70;

        if (token) {
            try {
                const decoded = jwt.verify(token, 'SUPER_SECRET_KEY');
                await User.findByIdAndUpdate(decoded.userId, {
                    $push: { history: { codeSnippet: code, review, score } }
                });
            } catch (e) { console.log("Invalid token, history not saved"); }
        }

        res.json({ review, fixedCode, score });
    } catch (error) {
        res.status(500).json({ error: "AI processing failed" });
    }
});

app.get('/api/history', async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Access denied" });

    try {
        const decoded = jwt.verify(token, 'SUPER_SECRET_KEY');
        const user = await User.findById(decoded.userId).select('history');
        res.json(user.history.reverse());
    } catch (err) {
        res.status(401).json({ error: "Session expired" });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));