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

// JWT_SECRET ko env se lena better hai, fallback ke liye aapki key rakhi hai
const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY';

// 1. Database Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codecritic';
mongoose.connect(MONGO_URI)
    .then(() => console.log("Database connected successfully"))
    .catch(err => console.log("Database connection error:", err));

// 2. User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }, 
    subscription: { type: String, default: 'free' }, 
    usageCount: { type: Number, default: 0 },       
    history: [{
        codeSnippet: String,
        review: String,
        score: Number,
        createdAt: { type: Date, default: Date.now }
    }]
});
const User = mongoose.model('User', userSchema);

// Middleware: Admin Check
const isAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (user && user.role === 'admin') {
            req.user = user;
            next();
        } else {
            res.status(403).json({ error: "Access denied. Admins only." });
        }
    } catch (err) { res.status(401).json({ error: "Invalid session" }); }
};

const hf = new HfInference(process.env.HF_TOKEN);

// --- NEW: Base Route (Taaki "Cannot GET /" na aaye) ---
app.get('/', (req, res) => {
    res.status(200).json({ message: "Visionary AI Backend is Live!" });
});

// 3. Auth Endpoints
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const userCount = await User.countDocuments();
        const role = userCount === 0 ? 'admin' : 'user';
        const newUser = new User({ email, password: hashedPassword, role });
        await newUser.save();
        res.status(201).json({ message: "Registration successful" });
    } catch (err) { res.status(400).json({ error: "User already exists" }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            token, 
            userId: user._id,
            email: user.email, 
            role: user.role, 
            subscription: user.subscription,
            usageCount: user.usageCount 
        });
    } catch (err) { res.status(500).json({ error: "Authentication failed" }); }
});

// 4. ADMIN CONTROL ENDPOINTS
app.get('/api/admin/stats', isAdmin, async (req, res) => {
    try {
        const users = await User.find({}).select('-password'); 
        const totalAudits = users.reduce((acc, user) => acc + (user.history ? user.history.length : 0), 0);
        res.json({ totalUsers: users.length, totalAudits, users });
    } catch (err) { res.status(500).json({ error: "Failed to fetch stats" }); }
});

// --- FIX: Added isAdmin middleware for security ---
app.patch('/api/admin/users/:id/role', isAdmin, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, req.body); 
        res.json({ message: "Status updated successfully" });
    } catch (err) { 
        res.status(500).json({ error: "Update failed" }); 
    }
});

app.delete('/api/admin/users/:id', isAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "User deleted" });
    } catch (err) { res.status(500).json({ error: "Delete failed" }); }
});

// 5. Core Logic
app.post('/api/review', async (req, res) => {
    const { code, token } = req.body;
    if (!token) return res.status(401).json({ error: "Please login to review code." });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (user.role !== 'admin' && user.subscription !== 'premium' && user.usageCount >= 3) {
            return res.status(403).json({ 
                error: "Free review limit reached! Please upgrade to Premium.",
                limitReached: true
            });
        }

        const response = await hf.chatCompletion({
            model: "Qwen/Qwen2.5-Coder-32B-Instruct", 
            messages: [
                {
                    role: "system",
                    content: `You are a Senior Principal Software Engineer. Audit code for security (OWASP Top 10), logic, and performance. Format: [Review] ### FIXED_CODE_BLOCK [Code] ### END_BLOCK`
                },
                { role: "user", content: `Review and refactor this code:\n${code}` }
            ],
            max_tokens: 2000, 
            temperature: 0.1, 
        });

        const fullText = response.choices[0].message.content;
        const fixedCodeMatch = fullText.match(/### FIXED_CODE_BLOCK([\s\S]*?)### END_BLOCK/);
        let fixedCode = fixedCodeMatch ? fixedCodeMatch[1].trim() : "";
        fixedCode = fixedCode.replace(/```[a-z]*\n|```/g, "").trim();
        const review = fullText.split("### FIXED_CODE_BLOCK")[0].trim();
        const score = Math.floor(Math.random() * (98 - 75 + 1)) + 75;

        await User.findByIdAndUpdate(decoded.userId, {
            $inc: { usageCount: 1 },
            $push: { history: { codeSnippet: code, review, score } }
        });

        res.json({ review, fixedCode, score, usageCount: user.usageCount + 1 });
    } catch (error) {
        res.status(500).json({ error: "AI Engine busy." });
    }
});

app.get('/api/history', async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Access denied" });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('history');
        res.json(user.history.reverse());
    } catch (err) { res.status(401).json({ error: "Session expired" }); }
});

// --- FIX: PORT ko dynamic kiya Render ke liye ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server is running on port ${PORT}`));