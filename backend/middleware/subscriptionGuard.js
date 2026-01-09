const checkLimit = async (req, res, next) => {
  const user = req.user; // User object from JWT middleware
  const today = new Date().toDateString();

  // Reset daily count if it's a new day
  if (user.lastResetDate.toDateString() !== today) {
    user.usageCount = 0;
    user.lastResetDate = new Date();
  }

  if (user.plan === 'free' && user.usageCount >= 3) {
    return res.status(403).json({ 
      error: "Daily Limit Reached", 
      message: "Upgrade to Pro for unlimited audits and PDF reports!" 
    });
  }

  next(); // Allow request if within limit
};