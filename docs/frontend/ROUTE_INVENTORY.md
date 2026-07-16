# Route Inventory

Every route carries: metadata, responsive layout, `loading` state, `error` boundary, empty
state where relevant, mobile behaviour, keyboard accessibility. `noindex` applied to admin,
account, checkout, private saved designs, and unsuitable search combinations (master prompt §25).

Status legend: `scaffold` = route exists with placeholder + states; `built` = designed &
integrated (mock or real); `verified` = all acceptance criteria pass.

## Storefront (`apps/storefront`)

| Route                                                                                        | Phase | Index       | Status        | Notes                                   |
| -------------------------------------------------------------------------------------------- | ----- | ----------- | ------------- | --------------------------------------- |
| `/`                                                                                          | F1    | yes         | scaffold (F0) | Editorial homepage; artwork is hero     |
| `/artworks`                                                                                  | F1    | yes         | planned       | Artwork-first gallery, URL filter state |
| `/artworks/[slug]`                                                                           | F1    | yes         | planned       | Gallery-style detail                    |
| `/collections`                                                                               | F1    | yes         | planned       |                                         |
| `/collections/[slug]`                                                                        | F1    | yes         | planned       |                                         |
| `/shop`                                                                                      | F1    | yes         | planned       | Product listing                         |
| `/products/[slug]`                                                                           | F1    | yes         | planned       | Sticky mobile purchase control          |
| `/design-studio`                                                                             | F2    | yes         | planned       | Separate bundle; guided config          |
| `/design-studio/[configurationId]`                                                           | F2    | no          | planned       | Resume saved config                     |
| `/drops`, `/drops/[slug]`                                                                    | F5    | yes         | planned       | Countdown/waitlist                      |
| `/stories`, `/stories/[slug]`                                                                | F1/F5 | yes         | planned       | Editorial                               |
| `/about`, `/artist`                                                                          | F1    | yes         | planned       |                                         |
| `/cart`                                                                                      | F3    | no          | planned       | Backend totals authoritative            |
| `/checkout` (+ `/success` `/pending` `/failed`)                                              | F3    | no          | planned       | Success requires backend verification   |
| `/track-order`                                                                               | F3    | yes         | planned       | Human-readable states                   |
| `/account` (+ `/orders`, `/orders/[orderNumber]`, `/saved-designs`, `/wishlist`, `/profile`) | F3    | no          | planned       | noindex                                 |
| `/search`                                                                                    | F1    | conditional | planned       |                                         |
| `/size-guide`, `/delivery`, `/returns`, `/care`, `/faq`, `/contact`                          | F1    | yes         | planned       | Editorial/policy                        |
| `/privacy`, `/terms`, `/cookies`                                                             | F1    | yes         | planned       | Legal                                   |

## Admin (`apps/admin`, protected, all `noindex`)

| Route                                                | Phase | Status        |
| ---------------------------------------------------- | ----- | ------------- |
| `/` dashboard                                        | F4    | scaffold (F0) |
| `/artworks` (+ upload, versions, approval)           | F4    | planned       |
| `/garments` (templates, colours, sizes, print areas) | F4    | planned       |
| `/orders` (+ `[id]`)                                 | F4    | planned       |
| `/production`                                        | F4    | planned       |
| `/fulfilment`                                        | F4    | planned       |
| `/customers`                                         | F4    | planned       |
| `/content` (+ Brand Storyteller)                     | F4/F5 | planned       |
| `/errors` (error centre)                             | F4    | planned       |
| `/analytics`                                         | F4    | planned       |

Root-level `layout`, `loading`, `error`, `not-found` established in F0 for both apps.
