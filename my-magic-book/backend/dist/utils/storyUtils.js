"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitStoryPreview = void 0;
/**
 * Splits a story text into a 30% free preview and 70% locked content.
 */
const splitStoryPreview = (text) => {
    if (!text)
        return { preview: '', locked: '', previewPercentage: 30 };
    const words = text.split(/\s+/);
    const totalWords = words.length;
    const previewWordCount = Math.floor(totalWords * 0.3);
    const preview = words.slice(0, previewWordCount).join(' ');
    const locked = words.slice(previewWordCount).join(' ');
    return { preview, locked, previewPercentage: 30 };
};
exports.splitStoryPreview = splitStoryPreview;
//# sourceMappingURL=storyUtils.js.map