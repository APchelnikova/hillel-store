const failure = ({ res, body }) => ({ status: res.statusCode, reason: body?.message });

const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : undefined);

const builders = [
    // ---------- auth ----------
    {
        method: "POST",
        path: "/api/auth/register",
        build: ({ req, body, ok, ...ctx }) => ({
            event: "auth.register",
            registration: {
                email: normalizeEmail(req.body?.email),
                success: ok
            },
            ...(ok ? { newUserId: body?.user?.id } : { rejection: failure({ body, ...ctx }) })
        })
    },
    {
        method: "POST",
        path: "/api/auth/login",
        build: ({ req, body, ok, ...ctx }) => ({
            event: "auth.login",
            attempt: {
                email: normalizeEmail(req.body?.email),
                success: ok
            },
            ...(ok
                ? { user: { id: body?.user?.id, role: body?.user?.role ?? "user" } }
                : { failure: failure({ body, ...ctx }) }),
            client: {
                ip: req.ip,
                userAgent: req.get("user-agent")
            }
        })
    },
    {
        method: "POST",
        path: "/api/auth/refresh",
        build: ({ req, body, ok }) => ({
            event: "auth.refresh",
            session: {
                hadCookie: Boolean(req.cookies?.refreshToken),
                renewed: ok
            },
            ...(!ok && { reason: body?.message })
        })
    },
    {
        method: "POST",
        path: "/api/auth/logout",
        build: ({ req }) => ({
            event: "auth.logout",
            hadActiveSession: Boolean(req.cookies?.refreshToken)
        })
    },

    // ---------- users ----------
    {
        method: "GET",
        path: "/api/users",
        build: ({ req, body }) => ({
            event: "users.listed",
            admin: req.user?.id,
            usersReturned: Array.isArray(body) ? body.length : 0
        })
    },
    {
        method: "POST",
        path: "/api/users",
        build: ({ req, body, ok, ...ctx }) => ({
            event: "user.created",
            createdBy: { id: req.user?.id, role: req.user?.role },
            newUser: {
                id: body?.id,
                email: normalizeEmail(req.body?.email),
                role: req.body?.role ?? "user"
            },
            ...(!ok && { rejection: failure({ body, ...ctx }) })
        })
    },
    {
        method: "GET",
        path: "/api/users/me",
        build: ({ req, body, ok }) => ({
            event: "account.viewed",
            userId: req.user?.id,
            settingsCount: ok ? Object.keys(body?.settings ?? {}).length : null
        })
    },
    {
        method: "PATCH",
        path: "/api/users/me/settings",
        build: ({ req, ok }) => {
            const changes = req.body && typeof req.body === "object" ? req.body : {};
            const keys = Object.keys(changes);
            return {
                event: "account.settings_updated",
                userId: req.user?.id,
                settings: {
                    changedKeys: keys.filter((k) => changes[k] !== null),
                    removedKeys: keys.filter((k) => changes[k] === null)
                },
                saved: ok
            };
        }
    },
    {
        method: "GET",
        path: "/api/users/:id",
        build: ({ req, params, ok }) => ({
            event: "user.viewed",
            target: { userId: params.id, found: ok },
            viewer: req.user?.id
        })
    },
    {
        method: "PUT",
        path: "/api/users/:id",
        build: ({ req, params, ok }) => ({
            event: "user.updated",
            targetUserId: params.id,
            changes: {
                fields: ["name", "email", "password"].filter((f) => req.body?.[f] !== undefined),
                passwordChanged: req.body?.password !== undefined
            },
            applied: ok,
            by: req.user?.id
        })
    },
    {
        method: "DELETE",
        path: "/api/users/:id",
        build: ({ req, params, ok }) => ({
            event: "user.deleted",
            deletion: {
                userId: params.id,
                type: "soft",
                done: ok
            },
            by: req.user?.id
        })
    },

    // ---------- products ----------
    {
        method: "GET",
        path: "/api/products",
        build: ({ req, res, body }) => ({
            event: "products.listed",
            filters: { category: req.query.category ?? null },
            pagination: { page: body?.page, limit: body?.limit },
            result: {
                returned: body?.products?.length ?? 0,
                total: body?.total ?? 0,
                fromCache: Boolean(res.locals.fromCache)
            }
        })
    },
    {
        method: "GET",
        path: "/api/products/:id",
        build: ({ params, body, ok }) => ({
            event: "product.viewed",
            product: ok
                ? {
                    id: params.id,
                    category: body?.category,
                    inStock: body?.stock > 0,
                    attributesCount: body?.attributes?.length ?? 0
                }
                : { id: params.id, found: false }
        })
    },
    {
        method: "POST",
        path: "/api/products",
        build: ({ req, body, ok, ...ctx }) => ({
            event: "product.created",
            product: {
                id: body?.id,
                name: req.body?.name,
                category: req.body?.category,
                pricing: {
                    price: req.body?.price,
                    initialStock: req.body?.stock
                }
            },
            owner: req.user ? { id: req.user.id, role: req.user.role } : null,
            ...(!ok && { rejection: { ...failure({ body, ...ctx }), fields: body?.errors } })
        })
    },
    {
        method: "PUT",
        path: "/api/products/:id",
        build: ({ req, params, ok }) => {
            const allowed = ["name", "price", "category", "stock", "description"];
            const changed = allowed.filter((f) => req.body?.[f] !== undefined);
            return {
                event: "product.updated",
                productId: params.id,
                newValues: Object.fromEntries(changed.map((f) => [f, req.body[f]])),
                applied: ok,
                by: req.user?.id
            };
        }
    },
    {
        method: "DELETE",
        path: "/api/products/:id",
        build: ({ req, res, params }) => ({
            event: "product.deleted",
            productId: params.id,
            outcome: {
                200: "deleted",
                401: "unauthorized",
                403: "not_owner",
                404: "not_found",
                409: "blocked_by_orders"
            }[res.statusCode] ?? "error",
            by: req.user?.id
        })
    },

    {
        method: "GET",
        path: "/api/products/:id/attributes",
        build: ({ params, body, ok }) => ({
            event: "product.attributes_listed",
            productId: params.id,
            attributes: ok ? { count: body?.length ?? 0, names: body?.map((a) => a.attributeName) } : null
        })
    },
    {
        method: "POST",
        path: "/api/products/:id/attributes",
        build: ({ req, params, body, ok, ...ctx }) => ({
            event: "product.attribute_added",
            product: { id: params.id },
            attribute: ok
                ? { id: body?.id, name: body?.attributeName, value: body?.attributeValue }
                : { name: req.body?.attributeName },
            addedBy: req.user?.id,
            ...(!ok && { rejection: failure({ body, ...ctx }) })
        })
    },

    // ---------- orders ----------
    {
        method: "POST",
        path: "/api/orders",
        build: ({ req, body, ok, ...ctx }) => {
            const items = Array.isArray(req.body?.items) ? req.body.items : [];
            return {
                event: "order.created",
                orderId: body?.id,
                buyer: req.user?.id,
                cart: items.map((i) => ({ productId: i?.productId, qty: i?.quantity })),
                totals: {
                    amount: body?.total,
                    positions: items.length,
                    units: items.reduce((sum, i) => sum + (Number(i?.quantity) || 0), 0)
                },
                ...(!ok && { rejection: failure({ body, ...ctx }) })
            };
        }
    },
    {
        method: "GET",
        path: "/api/orders",
        build: ({ req, body }) => ({
            event: "orders.listed",
            scope: req.user?.role === "admin" ? "all" : "own",
            requester: req.user?.id,
            ordersReturned: Array.isArray(body) ? body.length : 0
        })
    },
    {
        method: "GET",
        path: "/api/orders/:id",
        build: ({ req, res, params }) => ({
            event: "order.viewed",
            orderId: params.id,
            access: {
                granted: res.statusCode === 200,
                denied: res.statusCode === 403,
                asAdmin: req.user?.role === "admin"
            }
        })
    },
    {
        method: "PATCH",
        path: "/api/orders/:id/status",
        build: ({ req, params, ok }) => ({
            event: "order.status_changed",
            orderId: params.id,
            transition: { to: req.body?.status, applied: ok },
            by: req.user?.id
        })
    }
];

const defaultBuilder = ({ req }) => ({
    event: "api.call",
    path: req.originalUrl.split("?")[0],
    ...(Object.keys(req.query).length > 0 && { query: req.query })
});

const toRegex = (path) =>
    new RegExp("^" + path.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "/?$");

const compiled = builders.map((b) => ({ ...b, regex: toRegex(b.path) }));

const findBuilder = (method, url) => {
    for (const b of compiled) {
        if (b.method !== method) continue;
        const match = b.regex.exec(url);
        if (match) return { endpoint: `${b.method} ${b.path}`, params: { ...match.groups }, build: b.build };
    }
    return { endpoint: `${method} ${url}`, params: {}, build: defaultBuilder };
};

module.exports = { findBuilder };
