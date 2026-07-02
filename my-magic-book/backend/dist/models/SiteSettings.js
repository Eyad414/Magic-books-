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
const SiteSettingsSchema = new mongoose_1.Schema({
    bookPackages: [
        {
            id: { type: String, required: true },
            label: { type: String, required: true },
            price: { type: Number, required: true },
            emoji: { type: String, required: true },
            desc: { type: String, required: true },
        },
    ],
    themes: [
        {
            id: { type: String, required: true },
            emoji: { type: String, required: true },
            label: { type: String, required: true },
            desc: { type: String, required: true },
            pages: { type: mongoose_1.Schema.Types.Mixed, default: [] },
            ready: { type: Boolean, default: false },
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
        },
    ],
}, { timestamps: true });
exports.default = mongoose_1.default.model('SiteSettings', SiteSettingsSchema);
//# sourceMappingURL=SiteSettings.js.map