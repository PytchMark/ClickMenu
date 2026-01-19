const jwt = require("jsonwebtoken");

const TOKEN_TTL = "12h";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is required in production");
    }
    return "dev-secret-change-me";
  }
  return process.env.JWT_SECRET;
};

const signToken = (payload) => {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn: TOKEN_TTL });
};

const verifyToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};

const extractBearer = (req) => {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  return token;
};

const requireAuth = (role) => (req, res, next) => {
  try {
    const token = extractBearer(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing token" });
    }
    const payload = verifyToken(token);
    if (role && payload.role !== role) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
};

const requireMerchant = requireAuth("merchant");
const requireAdmin = requireAuth("admin");

module.exports = {
  signToken,
  requireMerchant,
  requireAdmin,
  getJwtSecret,
};
