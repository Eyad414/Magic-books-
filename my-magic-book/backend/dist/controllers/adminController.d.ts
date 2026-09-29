import { Request, Response } from 'express';
export declare const listMessages: (_req: Request, res: Response) => Promise<void>;
export declare const setMessageRead: (req: Request, res: Response) => Promise<void>;
export declare const deleteMessage: (req: Request, res: Response) => Promise<void>;
export declare const getCustomerByEmail: (req: Request, res: Response) => Promise<void>;
export declare const getAllStories: (req: Request, res: Response) => Promise<void>;
export declare const updateStory: (req: Request, res: Response) => Promise<void>;
export declare const deleteStory: (req: Request, res: Response) => Promise<void>;
export declare const addAdmin: (req: Request, res: Response) => Promise<void>;
export declare const removeAdmin: (req: Request, res: Response) => Promise<void>;
export declare const getTeam: (req: Request, res: Response) => Promise<void>;
export declare const getSettings: (req: Request, res: Response) => Promise<void>;
/**
 * Live counts for the numbers under the hero.
 *
 * These were fixed strings — "+300", "+150" — and a parent reading them is
 * being told a fact. They are counted from the database now, so the page can
 * only ever claim what actually happened.
 *
 * Books counts the ones with artwork, not started drafts; families counts
 * distinct accounts with a settled order, so one buyer with three books is one
 * family. Ready stories is what a customer can actually pick today.
 */
export declare const getLiveStats: (_req: Request, res: Response) => Promise<void>;
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
export declare const booksPrintReadiness: (req: Request, res: Response) => Promise<void>;
export declare const prepareBooksPrint: (req: Request, res: Response) => Promise<void>;
export declare const bulkPrintBooks: (req: Request, res: Response) => Promise<void>;
export declare const bulkPrintOrders: (req: Request, res: Response) => Promise<void>;
export declare const attachOrderPrintFiles: (req: Request, res: Response) => Promise<void>;
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
/**
 * Send a finished demo book to the printer, straight from the readiness list.
 *
 * Until now the only way to print one was to open the book viewer and send it
 * from there, one at a time — the readiness panel could say a book was ready
 * but not act on it. Real money: the caller confirms, and this refuses a book
 * whose artwork is incomplete rather than paying to print a gap.
 */
export declare const sendReadyThemeBook: (req: Request, res: Response) => Promise<void>;
/**
 * Record a visit. Called once per browser session from the public site.
 *
 * Anonymous by construction: the id is generated in the browser, and nothing
 * here reads the request's address or user agent. A visitor who never signs up
 * still counts — which is the point, since an account is the last step of a
 * visit, not the first.
 */
export declare const trackVisit: (req: Request, res: Response) => Promise<void>;
/**
 * Today's visits, one row per browser.
 *
 * A visitor has a name only when they have signed in on that browser — that
 * is the one honest way to know who someone is. For everyone else this shows
 * what they did, not who they are: where they came from, what they opened,
 * how many pages. Nothing here fingerprints a person or reads their address.
 */
export declare const listVisits: (req: Request, res: Response) => Promise<void>;
/**
 * Check a discount code. Public, because the checkout has to say whether a code
 * works before the order exists — but the number it returns is only for
 * display: the order recomputes everything from the same source.
 */
export declare const checkCoupon: (req: Request, res: Response) => Promise<void>;
export declare const listCustomers: (_req: Request, res: Response) => Promise<void>;
/**
 * Ask BookPod what actually happened to the jobs we sent, and write it down.
 *
 * Read-only against BookPod — this never submits anything. It exists because
 * a job's status is captured once, at submission, and then goes stale: six
 * orders were showing "in production" in the dashboard while every one of them
 * had been cancelled at the printer.
 */
export declare const refreshPrintJobStatuses: (_req: Request, res: Response) => Promise<void>;
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
/**
 * POST /api/admin/books/send-to-customer
 *
 * Puts a book the owner made into a customer's own account, where it appears
 * beside anything they bought and opens like their own book.
 *
 * The artwork is REFERENCED, never copied: the same GCS object paths are
 * written onto a new Story owned by the customer. Copying the files would
 * double the storage for every gift and leave two sets to keep in step; moving
 * the original would take the book out of الكتب الجاهزة.
 *
 * It carries no price and no order, because nobody bought it.
 */
export declare const sendBookToCustomer: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/birthday-coupons/grant
 *
 * Hand the yearly gift out now, to every account that does not already have an
 * unspent one. The automatic grant waits for a real anniversary — no account
 * is a year old yet — so this exists for the owner who wants to start now.
 *
 * dryRun by default: this gives away books.
 */
export declare const grantBirthdayCoupons: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/stories/:id/trim-borders
 *
 * Take the white frame off a story's pages. Some generated pages come back
 * with the drawing padded — most often a bar down the left and right — and no
 * layout can hide it: the page is square, the image is square, and the white
 * is inside the picture.
 *
 * `dryRun` reports what would be cut without touching anything, because this
 * overwrites artwork the customer may already have seen. Every page that IS
 * rewritten keeps its original alongside as <name>.orig.png.
 */
export declare const trimStoryBorders: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/orders/:id/send-digital
 *
 * Hand a finished order to its customer as a book they READ in their account —
 * the other half of "the book is done", next to sending it to the printer.
 *
 * Deliberately NOT a file. The story already belongs to this customer, so
 * nothing is copied and no PDF is attached or linked: they open it from
 * «قصصي». Whether they may also download the PDF is decided by the package
 * they bought, in the customer route, and is not affected by this button.
 *
 * The message is tied to the story so it appears in their conversation with
 * the book card attached, and it carries the unread badge like any other.
 */
export declare const sendOrderDigital: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/print-jobs/:orderNo/pay
 *
 * Pays one BookPod print job with a card. ADMIN ONLY, deliberately: the card
 * number passes through this request, which puts us in PCI-DSS scope, so it
 * stays a tool the owner uses to settle their own print runs and is never
 * exposed to customers.
 *
 * Nothing about the card is logged, echoed or stored — only BookPod's
 * paymentReference, which is the reconciliation key.
 */
export declare const payPrintJob: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=adminController.d.ts.map