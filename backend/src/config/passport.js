import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { User } from '../models/user.model.js';

// Helper function to guarantee unique usernames
const generateUniqueUsername = async (baseName) => {
    let username = baseName.replace(/\s+/g, '').toLowerCase();
    let isUnique = false;
    
    while (!isUnique) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            // Append random 4-digit number if collision occurs
            username = `${baseName.replace(/\s+/g, '').toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
        } else {
            isUnique = true;
        }
    }
    return username;
};

// Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/v1/users/auth/google/callback",
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        
        // Check if user exists by email if they signed up manually first
        if (!user) {
             const existingEmailUser = await User.findOne({ email: profile.emails[0].value });
             if (existingEmailUser) {
                 // Link Google ID to existing manual account
                 existingEmailUser.googleId = profile.id;
                 await existingEmailUser.save();
                 return done(null, existingEmailUser);
             }

            // Otherwise, create a brand new user with a safe username
            const uniqueUsername = await generateUniqueUsername(profile.displayName);
            
            user = await User.create({
                googleId: profile.id,
                username: uniqueUsername,
                email: profile.emails[0].value,
                avatar: profile.photos?.[0]?.value || 'default-avatar.png'
            });
        }
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// GitHub
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "/api/v1/users/auth/github/callback",
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ githubId: profile.id });
        
        if (!user) {
             const emailToUse = profile.emails?.[0].value || `${profile.username}@github.com`;
             const existingEmailUser = await User.findOne({ email: emailToUse });
             
             if (existingEmailUser) {
                 existingEmailUser.githubId = profile.id;
                 await existingEmailUser.save();
                 return done(null, existingEmailUser);
             }

            // Ensure unique username
            const uniqueUsername = await generateUniqueUsername(profile.username);

            user = await User.create({
                githubId: profile.id,
                username: uniqueUsername,
                email: emailToUse,
                avatar: profile.photos?.[0]?.value || 'default-avatar.png'
            });
        }
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));