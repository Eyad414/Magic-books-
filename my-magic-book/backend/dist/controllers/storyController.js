"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGeneratePdf = exports.deleteMyStory = exports.getMyStories = exports.getFullStory = exports.getStoryPreview = exports.customizeStory = exports.generateStory = exports.createStory = void 0;
const Story_1 = __importDefault(require("../models/Story"));
const storyUtils_1 = require("../utils/storyUtils");
const AI_Generator_1 = require("../services/AI_Generator");
// @route POST /api/stories/create
const createStory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { childName, childAge, childGender, childPhotoUrl, theme, storyLength, language, customThemeNote, mode, templatePages } = req.body;
        const resolvedMode = mode === 'ai' ? 'ai' : 'template';
        const story = await Story_1.default.create({
            userId,
            childName,
            childAge,
            childGender,
            childPhotoUrl,
            theme: theme || 'adventure',
            storyLength: storyLength || 'medium',
            language: language || 'ar',
            customThemeNote,
            mode: resolvedMode,
            // Only persist templatePages when relevant; saves DB space for AI stories.
            templatePages: resolvedMode === 'template' && Array.isArray(templatePages) ? templatePages : undefined,
            status: 'draft',
        });
        res.status(201).json({ success: true, story });
    }
    catch (error) {
        console.error('[createStory] failed:', error);
        res.status(500).json({ success: false, message: error?.message || 'فشل في إنشاء القصة' });
    }
};
exports.createStory = createStory;
// @route POST /api/stories/:id/generate
const generateStory = async (req, res) => {
    try {
        const story = await Story_1.default.findById(req.params.id);
        if (!story) {
            res.status(404).json({ success: false, message: 'القصة غير موجودة' });
            return;
        }
        story.status = 'generating';
        await story.save();
        const generatedText = await (0, AI_Generator_1.generateStoryWithAI)({
            childName: story.childName,
            childAge: Number(story.childAge) || 5,
            childGender: story.childGender,
            theme: story.theme,
            storyLength: story.storyLength,
            language: story.language,
            customThemeNote: story.customThemeNote,
        });
        story.generatedText = generatedText;
        story.status = 'ready';
        await story.save();
        res.json({ success: true, story });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في توليد القصة' });
    }
};
exports.generateStory = generateStory;
// @route PUT /api/stories/:id/customize
const customizeStory = async (req, res) => {
    try {
        const story = await Story_1.default.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
        if (!story) {
            res.status(404).json({ success: false, message: 'القصة غير موجودة' });
            return;
        }
        res.json({ success: true, story });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في تحديث القصة' });
    }
};
exports.customizeStory = customizeStory;
// @route GET /api/stories/:id/preview — returns first 30%
const getStoryPreview = async (req, res) => {
    try {
        const story = await Story_1.default.findById(req.params.id);
        if (!story) {
            res.status(404).json({ success: false, message: 'القصة غير موجودة' });
            return;
        }
        const { preview } = (0, storyUtils_1.splitStoryPreview)(story.generatedText || '');
        res.json({
            success: true,
            preview,
            childName: story.childName,
            theme: story.theme,
            coverImageUrl: story.coverImageUrl,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في جلب المعاينة' });
    }
};
exports.getStoryPreview = getStoryPreview;
// @route GET /api/stories/:id/full — requires paid order
const getFullStory = async (req, res) => {
    try {
        const story = await Story_1.default.findById(req.params.id);
        if (!story) {
            res.status(404).json({ success: false, message: 'القصة غير موجودة' });
            return;
        }
        res.json({ success: true, story });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في جلب القصة' });
    }
};
exports.getFullStory = getFullStory;
// @route GET /api/stories/my
const getMyStories = async (req, res) => {
    try {
        const userId = req.user._id;
        const stories = await Story_1.default.find({ userId }).sort({ createdAt: -1 });
        res.json({ success: true, stories });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في جلب القصص' });
    }
};
exports.getMyStories = getMyStories;
// @route DELETE /api/stories/:id — a user cancels/removes their own story.
const deleteMyStory = async (req, res) => {
    try {
        const userId = req.user._id;
        const story = await Story_1.default.findById(req.params.id);
        if (!story) {
            res.status(404).json({ success: false, message: 'القصة غير موجودة' });
            return;
        }
        if (String(story.userId) !== String(userId)) {
            res.status(403).json({ success: false, message: 'غير مصرح' });
            return;
        }
        await story.deleteOne();
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في حذف القصة' });
    }
};
exports.deleteMyStory = deleteMyStory;
// @route GET /api/public/test-pdf
const HtmlTemplateBuilder_1 = require("../services/HtmlTemplateBuilder");
const PdfGenerator_1 = require("../services/PdfGenerator");
const testGeneratePdf = async (req, res) => {
    try {
        const dummyPages = [];
        for (let i = 0; i < 13; i++) {
            dummyPages.push({ type: 'text', content: 'كان يا ما كان، طفل اسمه إياد، كان يحب المغامرات كثيراً... هذه الصفحة رقم ' + (i + 1) });
            dummyPages.push({ type: 'image', imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' });
        }
        const bookData = {
            childName: 'إياد',
            childPhotoUrl: 'https://ui-avatars.com/api/?name=إياد&background=D4A937&color=0a1628&size=300',
            storyTitle: 'إياد في الغابة السحرية',
            coverImageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
            pages: dummyPages
        };
        const html = (0, HtmlTemplateBuilder_1.buildBookHtml)(bookData);
        const pdfBuffer = await (0, PdfGenerator_1.generateBookPdf)(html);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="magic-fanoose-book.pdf"');
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.testGeneratePdf = testGeneratePdf;
//# sourceMappingURL=storyController.js.map