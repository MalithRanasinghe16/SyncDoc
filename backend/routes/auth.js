import express from "express";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  "/register",
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          message: "User already exists with this email",
        });
      }

      // Create new user
      const user = new User({
        name,
        email,
        password,
      });

      await user.save();

      // Generate token
      const token = generateToken(user._id);

      // Update user online status
      await user.updateLastSeen();

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: user.displayInfo,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        message: "Server error during registration",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("password").exists().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user and include password for comparison
      const user = await User.findByEmail(email).select("+password");
      if (!user) {
        return res.status(401).json({
          message: "Invalid credentials",
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Invalid credentials",
        });
      }

      // Generate token
      const token = generateToken(user._id);

      // Update user online status
      await user.updateLastSeen();

      res.json({
        message: "Login successful",
        token,
        user: user.displayInfo,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        message: "Server error during login",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/auth/google
// @desc    Google OAuth login with server-side verification
// @access  Public
router.post(
  "/google",
  [
    body("access_token")
      .notEmpty()
      .withMessage("Google access token is required"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { access_token } = req.body;

      // Verify token with Google and get user info
      const fetchWithTimeout = (url, options, timeout = 5000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out")), timeout)
          ),
        ]);
      };

      let googleResponse;
      try {
        // First get user info
        googleResponse = await fetchWithTimeout(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );

        // If successful, get high-res profile picture
        if (googleResponse.ok) {
          const userInfo = await googleResponse.json();
          // Get high quality profile picture by removing /s96-c/ from the URL
          const highResAvatar = userInfo.picture
            ? userInfo.picture.replace("/s96-c/", "/s400-c/")
            : null;
          return {
            ok: true,
            json: async () => ({
              ...userInfo,
              picture: highResAvatar,
            }),
          };
        }
      } catch (error) {
        if (error.message === "Request timed out") {
          return res.status(504).json({
            message: "Google API request timed out",
          });
        }
        return res.status(503).json({
          message: "Network error while contacting Google API",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }

      if (!googleResponse.ok) {
        return res.status(401).json({
          message: "Invalid Google access token",
        });
      }

      const googleUser = await googleResponse.json();
      const { sub: googleId, email, name, picture: avatar } = googleUser;

      // Check if user exists with Google ID
      let user = await User.findOne({ googleId });

      if (user) {
        // User exists, update their info and login
        user.name = name;
        user.email = email;
        if (avatar) user.avatar = avatar;
        await user.save();
      } else {
        // Check if user exists with this email
        user = await User.findByEmail(email);

        if (user) {
          // Link Google account to existing user
          user.googleId = googleId;
          user.name = name;
          if (avatar) user.avatar = avatar;
          await user.save();
        } else {
          // Create new user
          user = new User({
            name,
            email,
            googleId,
            avatar: avatar || undefined, // Let the default function handle it if no avatar
          });
          await user.save();
        }
      }

      // Generate token
      const token = generateToken(user._id);

      // Update user online status
      await user.updateLastSeen();

      res.json({
        message: "Google login successful",
        token,
        user: user.displayInfo,
      });
    } catch (error) {
      console.error("Google login error:", error);
      res.status(500).json({
        message: "Server error during Google login",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/auth/logout
// @desc    Logout user (set offline status)
// @access  Private (but we'll handle it without middleware to be flexible)
router.post("/logout", async (req, res) => {
  try {
    // Try to get user from token if provided
    const authHeader = req.header("Authorization");
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (user) {
          user.isOnline = false;
          user.lastSeen = new Date();
          await user.save();
        }
      } catch (error) {
        // Token might be invalid, but that's okay for logout
        console.log("Token verification failed during logout:", error.message);
      }
    }

    res.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Server error during logout",
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get("/me", async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.header("Authorization");
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // Update last seen
    await user.updateLastSeen();

    res.json({
      user: user.displayInfo,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// @route   DELETE /api/auth/delete-account
// @desc    Delete user account and all associated data
// @access  Private
router.delete("/delete-account", async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.header("Authorization");
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // Import Document model to delete user's documents
    const Document = (await import("../models/Document.js")).default;
    const Version = (await import("../models/Version.js")).default;

    // Delete all documents owned by the user
    const userDocuments = await Document.find({ ownerId: user._id });

    // Delete all versions for user's documents
    for (const doc of userDocuments) {
      await Version.deleteMany({ documentId: doc._id });
    }

    // Delete all documents owned by the user
    await Document.deleteMany({ ownerId: user._id });

    // Remove user from collaborators list in other documents
    await Document.updateMany(
      { "collaborators.user": user._id },
      { $pull: { collaborators: { user: user._id } } }
    );

    // Delete the user account
    await User.findByIdAndDelete(user._id);

    res.json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    res.status(500).json({
      message: "Server error during account deletion",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export default router;
