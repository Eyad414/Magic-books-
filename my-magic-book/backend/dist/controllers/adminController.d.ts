import { Request, Response } from 'express';
export declare const listMessages: (_req: Request, res: Response) => Promise<void>;
export declare const deleteMessage: (req: Request, res: Response) => Promise<void>;
export declare const getCustomerByEmail: (req: Request, res: Response) => Promise<void>;
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
/**
 * Confirm that a customer's payment arrived, WITHOUT building or printing.
 *
 * BookPod takes the card payment on their own page, but they have no webhook
 * and no way to look a payment up by reference before a print job exists — and
 * the customer pays before the book is built. So somebody sees the payment in
 * the BookPod account and says so here.
 *
 * Deliberately separate from the build: "Send to BookPod" also marks an order
 * paid, which is the wrong tool for a card payment because it immediately
 * spends money on generation and a print run. This only records the money.
 *
 * One-way, like PaymentPoller: it moves pending → paid and nothing else. An
 * order that is already paid is left alone rather than re-stamped, so a second
 * click cannot overwrite who confirmed it the first time.
 */
export declare const confirmOrderPayment: (req: Request, res: Response) => Promise<void>;
export declare const buildOrderBook: (req: Request, res: Response) => Promise<void>;
export declare const getOrderBuildStatus: (req: Request, res: Response) => Promise<void>;
export declare const reRenderOrderFiles: (req: Request, res: Response) => Promise<void>;
export declare const reRenderOrderColoring: (req: Request, res: Response) => Promise<void>;
export declare const submitOrderColoring: (req: Request, res: Response) => Promise<void>;
export declare const checkPayments: (_req: Request, res: Response) => Promise<void>;
export declare const printBook: (req: Request, res: Response) => Promise<void>;
export declare const printBookSubmit: (req: Request, res: Response) => Promise<void>;
export declare const generatePreviewIllustrations: (req: Request, res: Response) => Promise<void>;
/**
 * Generate a COLORING-BOOK preview for a theme: a colored front cover + 16
 * line-art pages + a colored back cover, using the admin-typed scenes and an
 * uploaded reference photo. Only runs when the admin clicks "Generate" (paid).
 */
export declare const generateColoringPreview: (req: Request, res: Response) => Promise<void>;
export declare const generatePhotorealPreview: (req: Request, res: Response) => Promise<void>;
/**
 * Re-impose a supplied PDF onto a chosen trim size and store it, print-ready.
 *
 * For books the owner already has as a finished file — their own titles, a
 * public-domain work, or a customer's manuscript they print as a service. The
 * generated Magic Fanoos books do not come through here; PrintService lays
 * those out from scratch.
 *
 * Deliberately does no rights checking: it cannot. Whether a given PDF may be
 * reprinted is the owner's call, and the dashboard says so next to the upload.
 */
export declare const importBookPdf: (req: Request, res: Response) => Promise<void>;
/**
 * Send an already-imported book to BookPod as a real print job.
 *
 * Separate from the import on purpose: importing is free and repeatable, this
 * spends money and produces physical copies, so it is its own deliberate act
 * with its own confirmation in the dashboard.
 *
 * Self-pickup by default — the owner printing their own stock collects from
 * BookPod, which needs only a name and phone rather than a delivery address.
 */
export declare const submitImportedBook: (req: Request, res: Response) => Promise<void>;
/**
 * Design a cover for an imported book.
 *
 * The importer's "cover" is page 1 of the supplied PDF, which for a manuscript
 * exported from Word is a page of body text. This generates real cover art from
 * what the owner says the book is about and lays it out as a wraparound (back +
 * spine + front) at the book's own trim — one paid image (~$0.039).
 */
export declare const designImportedCover: (req: Request, res: Response) => Promise<void>;
/**
 * Use the owner's OWN cover for an imported book.
 *
 * The importer takes page 1 of the supplied PDF, and designImportedCover draws
 * one — but neither helps when the owner already HAS the cover, which for a
 * real title is the normal case: a designer made it, and it is the only cover
 * that may legitimately go on that book.
 *
 * A PDF is taken as-is: it is already the artwork the printer should receive,
 * and re-laying it out would only degrade it. An IMAGE is composed into the
 * same wraparound the designer produces (back + spine + front, title typeset),
 * because a bare JPEG is not a print file.
 */
export declare const uploadImportedCover: (req: Request, res: Response) => Promise<void>;
/** The most recent books sent to the printer, newest first. */
export declare const listPrintJobs: (req: Request, res: Response) => Promise<void>;
/**
 * Which demo books are complete enough to send to the printer.
 *
 * Answers from STORAGE rather than the theme record: the seed writes the
 * expected object paths before anything is generated, so a book can read as
 * ready while its images 404 — and a print run is real money. Nineteen books is
 * also too many to check by opening every page.
 */
export declare const getPrintReadiness: (_req: Request, res: Response) => Promise<void>;
export declare const listImportedFiles: (_req: Request, res: Response) => Promise<void>;
export declare const deleteImportedFiles: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=adminController.d.ts.map