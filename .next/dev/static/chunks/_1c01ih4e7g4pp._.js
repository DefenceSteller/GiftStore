(()=>{"use strict";(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>HomePage,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$products$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/products.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$store$2f$ProductCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/store/ProductCard.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
const dynamic = "force-dynamic";
function HomePage() {
    _s();
    const [categories, setCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [products, setProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [visibleProducts, setVisibleProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HomePage.useEffect": ()=>{
            fetchProducts();
            fetchCategories();
        }
    }["HomePage.useEffect"], []);
    async function fetchProducts() {
        const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$products$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getProducts"])({
            sort: "featured",
            limit: 12
        });
        setProducts(data.items || []);
        setVisibleProducts(data.items || []);
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HomePage.useEffect": ()=>{
            // Initialize reveals after content lands
            const revealElements = document.querySelectorAll('.reveal');
            const revealObserver = new IntersectionObserver({
                "HomePage.useEffect": (entries)=>{
                    entries.forEach({
                        "HomePage.useEffect": (entry)=>{
                            if (entry.isIntersecting) {
                                entry.target.classList.add("visible");
                            }
                        }
                    }["HomePage.useEffect"]);
                }
            }["HomePage.useEffect"], {
                threshold: 0.1
            });
            revealElements.forEach({
                "HomePage.useEffect": (el)=>revealObserver.observe(el)
            }["HomePage.useEffect"]);
        }
    }["HomePage.useEffect"], []);
    async function fetchCategories() {
        const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$products$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCategories"])();
        setCategories(data.items || []);
    }
    // Category emojis from original Express design
    const categoryEmoji = {
        "Home & Cozy": "🛋️",
        "Tech & Gadgets": "⚡",
        "Personalized": "🪪",
        "For Him": "🪒",
        "For Her": "💅",
        "Self-Care": "🛁",
        "Experiences": "🎈",
        "Under Rs 25": "💸"
    };
    // Render category chips matching original Express design
    function renderCategoryChips() {
        return categoryEmoji && Object.keys(categoryEmoji).length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-wrap gap-2 mb-6",
            children: Object.entries(categoryEmoji).map(([name, emoji])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: `/shop?category=${name}`,
                    className: "inline-flex items-center rounded-full border border-ink/10 bg-ink/5 px-3 py-1.5 text-sm font-bold text-ink/60 hover:text-ink",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "mr-1.5",
                            children: emoji
                        }, void 0, false, {
                            fileName: "[project]/app/page.tsx",
                            lineNumber: 64,
                            columnNumber: 13
                        }, this),
                        " ",
                        name
                    ]
                }, name, true, {
                    fileName: "[project]/app/page.tsx",
                    lineNumber: 59,
                    columnNumber: 11
                }, this))
        }, void 0, false, {
            fileName: "[project]/app/page.tsx",
            lineNumber: 57,
            columnNumber: 7
        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mb-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                href: "/shop",
                className: "underline",
                children: "Shop all gifts"
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 70,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/page.tsx",
            lineNumber: 69,
            columnNumber: 7
        }, this);
    }
    // Render hero product cards EXACT matching original Express design
    function renderHeroProducts() {
        if (!visibleProducts.length) return null;
        const picks = visibleProducts.slice(0, 3);
        const layouts = [
            {
                left: '0',
                top: '6%',
                zIndex: '3',
                rotate: '-5'
            },
            {
                left: 'right',
                top: '30%',
                zIndex: '2',
                rotate: '6'
            },
            {
                left: '8%',
                bottom: '0',
                zIndex: '4',
                rotate: '-2'
            }
        ];
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            id: "hero-stage",
            className: "relative pt-6 pb-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    class: "absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-iris/20 blur-3xl"
                }, void 0, false, {
                    fileName: "[project]/app/page.tsx",
                    lineNumber: 91,
                    columnNumber: 9
                }, this),
                picks.map((p, i)=>{
                    const [c1, c2] = String(p.gradient || '').split(',');
                    const layout = layouts[i];
                    const style = {
                        left: layout.left,
                        top: layout.top,
                        zIndex: layout.zIndex,
                        transform: `rotate(${layout.rotate}deg)`
                    };
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        href: `/product/${encodeURIComponent(p.slug)}`,
                        className: "absolute hero-product block w-[58%] overflow-hidden rounded-[26px] border-2 border-ink bg-white shadow-sticker transition hover:-translate-y-2 hover:shadow-lift",
                        style: style,
                        title: p.name,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                class: "relative aspect-[4/3] overflow-hidden",
                                style: `
                  background:linear-gradient(135deg, ${c1}, ${c2 || c1})
                `,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: p.image,
                                        alt: p.name,
                                        class: "h-full w-full object-cover",
                                        loading: "lazy"
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 117,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        class: "absolute left-3 top-3 sticker bg-white",
                                        children: p.discountPct > 0 ? `-${p.discountPct}%` : 'Hot 🔥'
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 123,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 111,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                class: "flex items-center justify-between gap-2 p-3.5",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    class: "min-w-0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            class: "truncate text-sm font-extrabold",
                                            children: p.name
                                        }, void 0, false, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 129,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            class: "text-xs font-bold text-ink/45",
                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["money"])(p.priceCents)
                                        }, void 0, false, {
                                            fileName: "[project]/app/page.tsx",
                                            lineNumber: 130,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/page.tsx",
                                    lineNumber: 128,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 127,
                                columnNumber: 15
                            }, this)
                        ]
                    }, p.id, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 104,
                        columnNumber: 13
                    }, this);
                }),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "absolute right-2 top-4 z-10 sticker rotate-6 border-2 border-ink bg-coral text-white shadow-sticker-sm",
                    children: "New drop"
                }, void 0, false, {
                    fileName: "[project]/app/page.tsx",
                    lineNumber: 138,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "absolute left-0 bottom-8 z-10 sticker -rotate-6 border-2 border-ink bg-acid shadow-sticker-sm",
                    children: "under Rs 50"
                }, void 0, false, {
                    fileName: "[project]/app/page.tsx",
                    lineNumber: 143,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/page.tsx",
            lineNumber: 86,
            columnNumber: 7
        }, this);
    }
    // Render product grid
    function renderProductGrid() {
        if (!visibleProducts.length) return null;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4",
            children: visibleProducts.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$store$2f$ProductCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    p: p
                }, void 0, false, {
                    fileName: "[project]/app/page.tsx",
                    lineNumber: 156,
                    columnNumber: 11
                }, this))
        }, void 0, false, {
            fileName: "[project]/app/page.tsx",
            lineNumber: 154,
            columnNumber: 7
        }, this);
    }
    // Render "Under Rs 25" section matching original
    function renderUnder25() {
        const under25Products = visibleProducts.filter((p)=>p.priceCents <= 2500);
        if (!under25Products.length) return null;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
            className: "mt-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between mb-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "font-display text-xl font-extrabold",
                            children: "Under Rs 25"
                        }, void 0, false, {
                            fileName: "[project]/app/page.tsx",
                            lineNumber: 169,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/shop?price-asc=1",
                            className: "text-ink/60 text-sm hover:text-underline",
                            children: "See all discounted"
                        }, void 0, false, {
                            fileName: "[project]/app/page.tsx",
                            lineNumber: 170,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/page.tsx",
                    lineNumber: 168,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-2 gap-2",
                    children: under25Products.slice(0, 4).map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$store$2f$ProductCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            p: p,
                            smaller: true
                        }, void 0, false, {
                            fileName: "[project]/app/page.tsx",
                            lineNumber: 176,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/app/page.tsx",
                    lineNumber: 174,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/page.tsx",
            lineNumber: 167,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "container-cc pb-20 pt-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: "text-xs font-bold text-ink/45",
                "aria-label": "Breadcrumb",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "/",
                    className: "transition hover:text-ink",
                    children: "Home"
                }, void 0, false, {
                    fileName: "[project]/app/page.tsx",
                    lineNumber: 186,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 185,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-7xl mx-auto",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "pt-6 pb-8",
                        children: [
                            renderHeroProducts(),
                            renderCategoryChips()
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 191,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "mt-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "font-display text-2xl font-extrabold font-bold sm:text-3xl mb-4",
                                children: "Bestsellers this week"
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 198,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-ink/50 mb-6",
                                children: "The gifts everyone's adding to their bag."
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 201,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4",
                                children: visibleProducts.slice(0, 8).map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$store$2f$ProductCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        p: p
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 206,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 204,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 197,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "mt-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "font-display text-2xl font-extrabold mb-4",
                                children: "Trending this week"
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 213,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4",
                                children: visibleProducts.slice(4, 12).map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$store$2f$ProductCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        p: p
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 218,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 216,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 212,
                        columnNumber: 9
                    }, this),
                    renderUnder25()
                ]
            }, void 0, true, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 189,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/page.tsx",
        lineNumber: 184,
        columnNumber: 5
    }, this);
}
_s(HomePage, "pShwo/cxQxMNjNV1rBbaRhmuTRw=");
_c = HomePage;
var _c;
__turbopack_context__.k.register(_c, "HomePage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/cart/AddToCartButton.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AddToCartButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$cart$2f$CartProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/cart/CartProvider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$cart$2f$CartDrawer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/cart/CartDrawer.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function AddToCartButton({ product, className = "btn-lime btn-sm", label = "＋ Add", openAfter = true }) {
    _s();
    const { add } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$cart$2f$CartProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCart"])();
    const [justAdded, setJustAdded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const disabled = !product.stock || product.stock <= 0;
    if (disabled) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "btn-outline btn-sm cursor-not-allowed opacity-60",
            children: "Sold out"
        }, void 0, false, {
            fileName: "[project]/src/components/cart/AddToCartButton.tsx",
            lineNumber: 26,
            columnNumber: 7
        }, this);
    }
    const handleClick = ()=>{
        add(product, 1);
        setJustAdded(true);
        setTimeout(()=>setJustAdded(false), 1200);
        if (openAfter) (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$cart$2f$CartDrawer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["openCart"])();
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        onClick: handleClick,
        className: justAdded ? `${className} !bg-ink !text-acid` : className,
        "aria-label": `Add ${product.name} to bag`,
        children: justAdded ? "✓ Added" : label
    }, void 0, false, {
        fileName: "[project]/src/components/cart/AddToCartButton.tsx",
        lineNumber: 40,
        columnNumber: 5
    }, this);
}
_s(AddToCartButton, "F7pFnWSHRSPLPT8NjFUH1yhbWHw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$cart$2f$CartProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCart"]
    ];
});
_c = AddToCartButton;
var _c;
__turbopack_context__.k.register(_c, "AddToCartButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/store/ProductCard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ProductCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$cart$2f$AddToCartButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/cart/AddToCartButton.tsx [app-client] (ecmascript)");
;
;
;
;
function Stars({ rating, count }) {
    const full = Math.round(rating);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: "flex items-center gap-1 text-[11px] font-bold text-ink/45",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "tracking-tight text-butter",
                children: [
                    "★".repeat(full),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-ink/20",
                        children: "★".repeat(5 - full)
                    }, void 0, false, {
                        fileName: "[project]/src/components/store/ProductCard.tsx",
                        lineNumber: 12,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/store/ProductCard.tsx",
                lineNumber: 10,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: [
                    "(",
                    count,
                    ")"
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/store/ProductCard.tsx",
                lineNumber: 14,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/store/ProductCard.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, this);
}
_c = Stars;
function ProductCard({ p }) {
    const disabled = !p.inStock;
    const [c1, c2] = (p.gradient || "").split(",");
    const badges = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            p.discountPct > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "sticker bg-coral text-white",
                children: [
                    "-",
                    p.discountPct,
                    "%"
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/store/ProductCard.tsx",
                lineNumber: 26,
                columnNumber: 9
            }, this),
            p.featured && p.discountPct <= 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "sticker bg-acid",
                children: "Bestseller"
            }, void 0, false, {
                fileName: "[project]/src/components/store/ProductCard.tsx",
                lineNumber: 29,
                columnNumber: 9
            }, this),
            !p.inStock && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "sticker bg-ink text-white",
                children: "Sold out"
            }, void 0, false, {
                fileName: "[project]/src/components/store/ProductCard.tsx",
                lineNumber: 31,
                columnNumber: 22
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/store/ProductCard.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
        className: "group relative flex flex-col overflow-hidden rounded-[28px] border border-ink/8 bg-white shadow-soft transition duration-300 hover:-translate-y-1.5 hover:border-ink/20 hover:shadow-lift",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                href: `/product/${encodeURIComponent(p.slug)}`,
                className: "relative block aspect-[4/3] overflow-hidden",
                style: {
                    background: `linear-gradient(135deg, ${c1}, ${c2 || "#000"})`
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: p.image,
                        alt: p.name,
                        loading: "lazy",
                        width: 800,
                        height: 800,
                        className: "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    }, void 0, false, {
                        fileName: "[project]/src/components/store/ProductCard.tsx",
                        lineNumber: 43,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute left-3 top-3 flex flex-wrap gap-1.5",
                        children: badges
                    }, void 0, false, {
                        fileName: "[project]/src/components/store/ProductCard.tsx",
                        lineNumber: 51,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/store/ProductCard.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-1 flex-col gap-1.5 p-4 sm:p-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] font-black uppercase tracking-[0.16em] text-ink/40",
                                children: p.category
                            }, void 0, false, {
                                fileName: "[project]/src/components/store/ProductCard.tsx",
                                lineNumber: 56,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Stars, {
                                rating: p.rating,
                                count: p.reviewCount
                            }, void 0, false, {
                                fileName: "[project]/src/components/store/ProductCard.tsx",
                                lineNumber: 59,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/store/ProductCard.tsx",
                        lineNumber: 55,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "font-display text-[17px] font-bold leading-snug",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: `/product/${encodeURIComponent(p.slug)}`,
                            className: "transition group-hover:text-iris",
                            children: p.name
                        }, void 0, false, {
                            fileName: "[project]/src/components/store/ProductCard.tsx",
                            lineNumber: 62,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/store/ProductCard.tsx",
                        lineNumber: 61,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "line-clamp-1 text-[13px] font-medium text-ink/50",
                        children: p.tagline
                    }, void 0, false, {
                        fileName: "[project]/src/components/store/ProductCard.tsx",
                        lineNumber: 69,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-auto flex items-end justify-between gap-3 pt-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-display text-xl font-extrabold",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["money"])(p.priceCents)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/store/ProductCard.tsx",
                                        lineNumber: 73,
                                        columnNumber: 13
                                    }, this),
                                    p.compareAtCents ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("s", {
                                        className: "ml-1.5 text-[13px] font-bold text-ink/35",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["money"])(p.compareAtCents)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/store/ProductCard.tsx",
                                        lineNumber: 77,
                                        columnNumber: 15
                                    }, this) : null
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/store/ProductCard.tsx",
                                lineNumber: 72,
                                columnNumber: 11
                            }, this),
                            disabled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "btn-outline btn-sm cursor-not-allowed opacity-60",
                                children: "Sold out"
                            }, void 0, false, {
                                fileName: "[project]/src/components/store/ProductCard.tsx",
                                lineNumber: 83,
                                columnNumber: 13
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$cart$2f$AddToCartButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                product: {
                                    id: p.id,
                                    slug: p.slug,
                                    name: p.name,
                                    priceCents: p.priceCents,
                                    emoji: p.emoji,
                                    gradient: p.gradient,
                                    image: p.image,
                                    stock: p.stock
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/store/ProductCard.tsx",
                                lineNumber: 87,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/store/ProductCard.tsx",
                        lineNumber: 71,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/store/ProductCard.tsx",
                lineNumber: 54,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/store/ProductCard.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, this);
}
_c1 = ProductCard;
var _c, _c1;
__turbopack_context__.k.register(_c, "Stars");
__turbopack_context__.k.register(_c1, "ProductCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/products.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getCategories",
    ()=>getCategories,
    "getProductBySlug",
    ()=>getProductBySlug,
    "getProducts",
    ()=>getProducts
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-client] (ecmascript)");
;
/** Map a raw DB row to the UI shape. `description` doubles as the tagline. */ function mapProduct(row) {
    const discountPct = row.compare_at_cents && row.compare_at_cents > row.price_cents ? Math.round((1 - row.price_cents / row.compare_at_cents) * 100) : 0;
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        tagline: row.description ?? "",
        category: row.category,
        priceCents: row.price_cents,
        compareAtCents: row.compare_at_cents || null,
        discountPct,
        emoji: row.emoji ?? "",
        gradient: row.gradient,
        rating: Number(row.rating ?? 0),
        reviewCount: row.review_count,
        // No is_featured column; treat the first few by sort_order as bestsellers.
        featured: row.sort_order <= 6,
        inStock: row.stock > 0,
        stock: row.stock,
        image: `/assets/img/products/${row.slug}.svg`
    };
}
const SORTS = {
    featured: {
        column: "sort_order",
        ascending: true
    },
    newest: {
        column: "created_at",
        ascending: false
    },
    "price-asc": {
        column: "price_cents",
        ascending: true
    },
    "price-desc": {
        column: "price_cents",
        ascending: false
    },
    rating: {
        column: "rating",
        ascending: false
    },
    popular: {
        column: "review_count",
        ascending: false
    }
};
async function getProducts(filters = {}) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    let query = supabase.from("products").select("id, slug, name, description, category, price_cents, compare_at_cents, emoji, gradient, rating, review_count, is_active, stock, sort_order, created_at").eq("is_active", true);
    if (filters.category) query = query.eq("category", filters.category);
    if (filters.max != null) query = query.lte("price_cents", filters.max);
    if (filters.featured) query = query.lte("sort_order", 6);
    if (filters.inStock) query = query.gt("stock", 0);
    if (filters.q) {
        const like = `%${filters.q}%`;
        query = query.or(`name.ilike.${like},description.ilike.${like}`);
    }
    const sort = SORTS[filters.sort ?? "featured"] ?? SORTS.featured;
    query = query.order(sort.column, {
        ascending: sort.ascending
    });
    const { data, error } = await query;
    if (error) {
        console.error("getProducts error:", error.message);
        return [];
    }
    return data.map(mapProduct);
}
async function getProductBySlug(slug) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data } = await supabase.from("products").select("id, slug, name, description, category, price_cents, compare_at_cents, emoji, gradient, rating, review_count, is_active, stock, sort_order, created_at").eq("slug", slug).eq("is_active", true).maybeSingle();
    if (!data) return {
        product: null,
        related: []
    };
    const product = mapProduct(data);
    product.description = data.description ?? "";
    product.maxQty = Math.min(product.stock, 10);
    const { data: relatedRows } = await supabase.from("products").select("id, slug, name, description, category, price_cents, compare_at_cents, emoji, gradient, rating, review_count, is_active, stock, sort_order, created_at").eq("is_active", true).eq("category", product.category).neq("id", product.id).limit(4);
    return {
        product,
        related: relatedRows?.map(mapProduct) ?? []
    };
}
async function getCategories() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const { data } = await supabase.from("products").select("category").eq("is_active", true);
    if (!data) return [];
    const counts = new Map();
    for (const row of data){
        counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
    }
    return [
        ...counts.entries()
    ].map(([name, count])=>({
            name,
            count
        })).sort((a, b)=>b.count - a.count);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/supabase/server.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-client] (ecmascript)");
;
;
async function createClient() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://ppolhziswextahhjfggi.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwb2xoemlzd2V4dGFoaGpmZ2dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyOTI0NjgsImV4cCI6MjEwODg2ODQ2OH0.G5rtNyF8rcQ-L73Mm0dx3D_WDD5uxFTnv12AMdcsxfg"), {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing sessions.
                }
            }
        }
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);})()

//# sourceMappingURL=_1c01ih4e7g4pp._.js.map