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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const StorySchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    childName: { type: String, required: true, trim: true },
    childAge: { type: String, required: true },
    childGender: { type: String, enum: ['male', 'female'], required: true },
    childPhotoUrl: { type: String },
    theme: {
        type: String,
        enum: ['adventure', 'space', 'ocean', 'forest', 'princess', 'superhero', 'animals', 'custom'],
        default: 'adventure',
    },
    storyLength: { type: String, enum: ['short', 'medium', 'long'], default: 'medium' },
    language: { type: String, enum: ['ar', 'en'], default: 'ar' },
    customThemeNote: { type: String },
    generatedText: { type: String },
    coverImageUrl: { type: String },
    status: {
        type: String,
        enum: ['draft', 'generating', 'ready', 'ordered'],
        default: 'draft',
    },
    coverColor: { type: String, default: '#1B1F5E' },
    fontStyle: { type: String, default: 'noto-kufi' },
    dedicationMessage: { type: String },
    addons: [{ type: String }],
    basePrice: { type: Number, default: 99 },
    totalPrice: { type: Number, default: 99 },
}, { timestamps: true });
exports.default = mongoose_1.default.model('Story', StorySchema);
//# sourceMappingURL=Story.js.map