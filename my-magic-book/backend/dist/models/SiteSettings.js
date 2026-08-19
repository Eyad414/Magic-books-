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
exports.DEFAULT_HOME_STATS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.DEFAULT_HOME_STATS = {
    storiesCreated: '+500',
    happyFamilies: '+100',
    readyStories: '+20',
    rating: '5 ⭐',
};
const SiteSettingsSchema = new mongoose_1.Schema({
    bookPackages: [
        {
            id: { type: String, required: true },
            label: { type: String, required: true },
            titles: { ar: String, en: String, he: String },
            descriptions: { ar: String, en: String, he: String },
            price: { type: Number, required: true },
            emoji: { type: String, required: true },
            desc: { type: String, required: true },
            hidden: { type: Boolean, default: false },
        },
    ],
    themes: [
        {
            id: { type: String, required: true },
            emoji: { type: String, required: true },
            label: { type: String, required: true },
            desc: { type: String, required: true },
            titles: { type: mongoose_1.Schema.Types.Mixed, default: undefined },
            descriptions: { type: mongoose_1.Schema.Types.Mixed, default: undefined },
            pages: { type: mongoose_1.Schema.Types.Mixed, default: [] },
            ready: { type: Boolean, default: false },
            // Series grouping — must be declared here, not just on ITheme, or
            // Mongoose drops them silently on save.
            series: { type: String, default: undefined },
            seriesName: { type: String, default: undefined },
            seriesPart: { type: Number, default: undefined },
            generatedImages: { type: [String], default: undefined },
            generatedPortrait: { type: String, default: undefined },
            generatedCover: { type: String, default: undefined },
            photorealTemplates: { type: [String], default: undefined },
            photorealCover: { type: String, default: undefined },
            photorealPortrait: { type: String, default: undefined },
            previewStyle: { type: String, default: undefined },
            isColoring: { type: Boolean, default: false },
            coloringScenes: { type: [String], default: undefined },
            coloringCoverScene: { type: String, default: undefined },
            coloringBackCoverScene: { type: String, default: undefined },
            // A story's colouring artwork, kept apart from its story artwork so a
            // colouring build can never overwrite the pages customers see.
            coloringCover: { type: String, default: undefined },
            coloringImages: { type: [String], default: undefined },
            coloringBackCover: { type: String, default: undefined },
        },
    ],
    homeStats: {
        storiesCreated: { type: String, default: exports.DEFAULT_HOME_STATS.storiesCreated },
        happyFamilies: { type: String, default: exports.DEFAULT_HOME_STATS.happyFamilies },
        readyStories: { type: String, default: exports.DEFAULT_HOME_STATS.readyStories },
        rating: { type: String, default: exports.DEFAULT_HOME_STATS.rating },
    },
    demoCards: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    allowSkipPhoto: { type: Boolean, default: false },
    aiModeEnabled: { type: Boolean, default: false },
}, { timestamps: true });
exports.default = mongoose_1.default.model('SiteSettings', SiteSettingsSchema);
//# sourceMappingURL=SiteSettings.js.map