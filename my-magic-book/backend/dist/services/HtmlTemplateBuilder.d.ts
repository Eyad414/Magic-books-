export interface BookPageData {
    type: 'text' | 'image';
    content?: string;
    imageUrl?: string;
}
export interface BookData {
    childName: string;
    childPhotoUrl: string;
    storyTitle: string;
    coverImageUrl: string;
    pages: BookPageData[];
}
export declare function buildBookHtml(data: BookData): string;
//# sourceMappingURL=HtmlTemplateBuilder.d.ts.map