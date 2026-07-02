import { Request, Response } from 'express';
export declare const getAllStories: (req: Request, res: Response) => Promise<void>;
export declare const updateStory: (req: Request, res: Response) => Promise<void>;
export declare const deleteStory: (req: Request, res: Response) => Promise<void>;
export declare const addAdmin: (req: Request, res: Response) => Promise<void>;
export declare const removeAdmin: (req: Request, res: Response) => Promise<void>;
export declare const getTeam: (req: Request, res: Response) => Promise<void>;
export declare const getSettings: (req: Request, res: Response) => Promise<void>;
export declare const getPublicSettings: (_req: Request, res: Response) => Promise<void>;
export declare const updateSettings: (req: Request, res: Response) => Promise<void>;
export declare const getAllOrders: (req: Request, res: Response) => Promise<void>;
export declare const buildOrderBook: (req: Request, res: Response) => Promise<void>;
export declare const reRenderOrderFiles: (req: Request, res: Response) => Promise<void>;
export declare const generatePreviewIllustrations: (req: Request, res: Response) => Promise<void>;
/**
 * Generate a COLORING-BOOK preview for a theme: a colored front cover + 16
 * line-art pages + a colored back cover, using the admin-typed scenes and an
 * uploaded reference photo. Only runs when the admin clicks "Generate" (paid).
 */
export declare const generateColoringPreview: (req: Request, res: Response) => Promise<void>;
export declare const generatePhotorealPreview: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=adminController.d.ts.map