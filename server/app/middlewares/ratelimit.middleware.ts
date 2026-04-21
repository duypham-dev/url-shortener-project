import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const getLinkRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many failed login attempts. Please try again after 15 minutes.',
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit by IP
        const ip = ipKeyGenerator(req);          // Use proper IPv6 handling
        return `getlink_${ip}`;
    },
    handler: (req, res) => {
        console.warn('Get links rate limit exceeded', {
            ip: req.ip,
            identifier: req.body?.identifier,
            userAgent: req.get('User-Agent')
        });
        return res.status(429).json({
                    success: false,
                    message: 'Too many failed get link attempts. Please try again after 1 minute.',
        });
    },

});