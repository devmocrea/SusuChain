;; Susu Global Circle Registry & Directory
;; Aggregates metadata for all savings circles deployed across the ecosystem.

(define-data-var owner principal tx-sender)
(define-data-var trusted-contract principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.susuchain)

;; ---- Data Maps ----

(define-map registered-circles
  { circle-id: uint }
  {
    creator: principal,
    name: (string-ascii 50),
    contribution: uint,
    member-count: uint,
    active: bool
  }
)

(define-data-var registry-count uint u0)

;; ---- Authorization Helpers ----

(define-read-only (is-owner)
  (is-eq tx-sender (var-get owner))
)

(define-read-only (is-trusted-caller)
  (or
    (is-eq contract-caller (var-get trusted-contract))
    (is-eq tx-sender (var-get owner))
  )
)
